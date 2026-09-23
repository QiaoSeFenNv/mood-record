import { Controller, Get, Inject, Query, Req, UseGuards } from '@nestjs/common';
import { calendarQuerySchema, weeklyQuerySchema } from '@mood-record/contracts';

import { AuthGuard } from '../auth/auth.guard.js';
import type { ContextRequest } from '../common/request-context.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { ReviewService } from './review.service.js';

@Controller('review')
@UseGuards(AuthGuard)
export class ReviewController {
  constructor(@Inject(ReviewService) private readonly review: ReviewService) {}

  @Get('weekly')
  weekly(
    @Req() request: ContextRequest,
    @Query(new ZodPipe(weeklyQuerySchema))
    query: { timezoneOffsetMinutes: number; anchorDate?: string },
  ) {
    return this.review.weekly(
      request.currentUser!.id,
      query.timezoneOffsetMinutes,
      query.anchorDate,
    );
  }

  @Get('calendar')
  calendar(
    @Req() request: ContextRequest,
    @Query(new ZodPipe(calendarQuerySchema))
    query: { year: number; month: number; timezoneOffsetMinutes: number },
  ) {
    return this.review.calendar(
      request.currentUser!.id,
      query.year,
      query.month,
      query.timezoneOffsetMinutes,
    );
  }
}
