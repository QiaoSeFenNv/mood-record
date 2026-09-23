import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  createMoodRequestSchema,
  resonanceQuerySchema,
  todayQuerySchema,
  type CreateMoodRequest,
} from '@mood-record/contracts';
import type { MoodBand } from '@mood-record/domain';

import { AuthGuard } from '../auth/auth.guard.js';
import type { ContextRequest, CurrentUser } from '../common/request-context.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { MoodService } from './mood.service.js';

function currentUser(request: ContextRequest): CurrentUser {
  if (!request.currentUser) throw new Error('缺少已验证的用户上下文');
  return request.currentUser;
}

@UseGuards(AuthGuard)
@Controller('moods')
export class MoodController {
  constructor(@Inject(MoodService) private readonly moods: MoodService) {}

  @Post()
  create(
    @Req() request: ContextRequest,
    @Body(new ZodPipe(createMoodRequestSchema)) input: CreateMoodRequest,
  ) {
    return this.moods.create(currentUser(request), input);
  }

  @Get('today')
  today(
    @Req() request: ContextRequest,
    @Query(new ZodPipe(todayQuerySchema)) query: { timezoneOffsetMinutes: number },
  ) {
    return this.moods.today(currentUser(request), query.timezoneOffsetMinutes);
  }

  @Delete(':id')
  async delete(@Req() request: ContextRequest, @Param('id') id: string) {
    const deleted = await this.moods.delete(currentUser(request), id);
    return { deleted };
  }
}

@UseGuards(AuthGuard)
@Controller('resonance')
export class ResonanceController {
  constructor(@Inject(MoodService) private readonly moods: MoodService) {}

  @Get()
  find(
    @Req() request: ContextRequest,
    @Query(new ZodPipe(resonanceQuerySchema))
    query: { moodBand: MoodBand; range: 'TODAY'; timezoneOffsetMinutes: number },
  ) {
    return this.moods.resonance(currentUser(request), query.moodBand, query.timezoneOffsetMinutes);
  }
}
