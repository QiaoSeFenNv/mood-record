import { Controller, Delete, Get, Header, Inject, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';

import { AuthGuard } from '../auth/auth.guard.js';
import type { ContextRequest } from '../common/request-context.js';
import { MeService } from './me.service.js';

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(@Inject(MeService) private readonly me: MeService) {}

  @Get('export.csv')
  @Header('Cache-Control', 'no-store')
  async exportCsv(@Req() request: ContextRequest, @Res() response: Response): Promise<void> {
    const csv = await this.me.exportCsv(request.currentUser!.id);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="mood-records.csv"');
    response.send(csv);
  }

  @Delete('moods')
  async clear(@Req() request: ContextRequest): Promise<{ cleared: true }> {
    await this.me.clear(request.currentUser!.id);
    return { cleared: true };
  }

  @Delete()
  async deleteAccount(@Req() request: ContextRequest): Promise<{ deleted: true }> {
    await this.me.deleteAccount(request.currentUser!.id);
    return { deleted: true };
  }
}
