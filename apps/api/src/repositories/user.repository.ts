import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { UserEntity } from '../database/entities/user.entity.js';

@Injectable()
export class UserRepository {
  constructor(@InjectRepository(UserEntity) private readonly repository: Repository<UserEntity>) {}

  async findOrCreateDevUser(id: string, subjectHash: string): Promise<UserEntity> {
    const existing = await this.repository.findOneBy({ providerSubjectHash: subjectHash });
    if (existing) return existing;
    await this.repository
      .createQueryBuilder()
      .insert()
      .values({
        id,
        authProvider: 'DEV',
        providerSubjectHash: subjectHash,
        dataEnvironment: 'TEST',
      })
      .orIgnore()
      .execute();
    const user = await this.repository.findOneBy({ providerSubjectHash: subjectHash });
    if (!user) throw new Error('创建测试身份失败');
    return user;
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.repository.findOneBy({ id });
  }

  async deleteById(id: string): Promise<void> {
    await this.repository.delete({ id });
  }
}
