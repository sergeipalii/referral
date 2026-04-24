import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ClicksService } from './clicks.service';

/**
 * Public (no auth) endpoints for click tracking. Two flavours:
 *
 * 1. **Redirect** (`GET /r/:partnerCode`) — classic affiliate link. Records
 *    the click, sets a cookie with the clickId, and 302-redirects to the
 *    `to` query param (or a default landing URL).
 *
 * 2. **First-party** (`POST /clicks`) — for SPAs or server-rendered pages
 *    that want to record the click from their own domain. Returns the
 *    clickId so the caller can set a first-party cookie themselves.
 */
@ApiTags('clicks')
@Controller()
export class ClicksController {
  constructor(private readonly clicksService: ClicksService) {}

  @Get('r/:partnerCode')
  @ApiOperation({
    summary:
      'Click redirect — records a click and 302-redirects to the landing URL',
  })
  @ApiResponse({ status: 302, description: 'Redirect to landing page' })
  async redirect(
    @Param('partnerCode') partnerCode: string,
    @Query('to') to: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const defaultLanding = to || '/';

    try {
      const click = await this.clicksService.create({
        partnerCode,
        ip:
          (req.headers['x-forwarded-for'] as string)?.split(',')[0] ??
          req.ip ??
          undefined,
        userAgent: req.headers['user-agent'] ?? undefined,
        referer: req.headers['referer'] ?? undefined,
        landingUrl: defaultLanding,
      });

      // Set cookie with clickId — TTL matches the attribution window.
      const maxAgeMs = click.expiresAt.getTime() - Date.now();
      res.cookie('rk_click', click.clickId, {
        maxAge: maxAgeMs,
        httpOnly: false, // JS on the client needs to read it
        sameSite: 'lax',
        path: '/',
      });

      res.redirect(302, defaultLanding);
    } catch {
      // If partner code is invalid, still redirect — don't break the user
      // experience just because attribution failed.
      res.redirect(302, defaultLanding);
    }
  }

  @Post('clicks')
  @ApiOperation({
    summary:
      'First-party click registration — returns clickId for the caller to set as a cookie on their domain',
  })
  @ApiResponse({
    status: 201,
    schema: {
      properties: {
        clickId: { type: 'string' },
        expiresAt: { type: 'string' },
      },
    },
  })
  async registerClick(
    @Body()
    body: { partnerCode: string; landingUrl?: string; referer?: string },
    @Req() req: Request,
  ): Promise<{ clickId: string; expiresAt: Date }> {
    const click = await this.clicksService.create({
      partnerCode: body.partnerCode,
      ip:
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ??
        req.ip ??
        undefined,
      userAgent: req.headers['user-agent'] ?? undefined,
      referer: body.referer ?? req.headers['referer'] ?? undefined,
      landingUrl: body.landingUrl ?? undefined,
    });
    return { clickId: click.clickId, expiresAt: click.expiresAt };
  }
}
