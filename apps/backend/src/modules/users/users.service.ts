import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import type { RequestUser } from '../../common/interfaces/authenticated-request.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async self(user: RequestUser): Promise<UserEntity> {
    const userRecord = await this.usersRepository.findOne({
      where: { id: user.id },
    });
    if (!userRecord) {
      throw new NotFoundException(`User not found`);
    }
    return userRecord;
  }

  async create(data: {
    email: string;
    hashedPassword: string;
    name?: string;
  }): Promise<UserEntity> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Email is already in use');
    }

    const user = this.usersRepository.create({
      email: data.email,
      hashedPassword: data.hashedPassword,
      name: data.name ?? null,
    });

    return this.usersRepository.save(user);
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User not found`);
    }
    user.hashedPassword = hashedPassword;
    await this.usersRepository.save(user);
  }
}
