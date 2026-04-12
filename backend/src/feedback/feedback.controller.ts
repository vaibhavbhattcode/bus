import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, Request, InternalServerErrorException, Query, Logger } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('feedback')
export class FeedbackController {
  private readonly logger = new Logger(FeedbackController.name);

  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  create(@Request() req: any, @Body() createFeedbackDto: CreateFeedbackDto) {
    return this.feedbackService.create(req.user.id, createFeedbackDto);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    try {
      const parsedPage = page ? Number(page) : undefined;
      const parsedLimit = limit ? Number(limit) : undefined;
      return await this.feedbackService.findAll({ page: parsedPage, limit: parsedLimit });
    } catch (error) {
      this.logger.error('Error in findAll:', error);
      throw new InternalServerErrorException(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  @Post(':id/reply')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  reply(@Param('id') id: string, @Body() body: { reply: string }) {
    return this.feedbackService.reply(id, body.reply);
  }

  @Get('public')
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  findAllPublic() {
    return this.feedbackService.findAllPublic();
  }

  @Get('provider/my-reviews')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  findMyReviews(@Request() req: any) {
    return this.feedbackService.findMyReviews(req.user.id);
  }

  @Get('provider/:id')
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  findByProvider(@Param('id') id: string) {
    return this.feedbackService.findByProvider(id);
  }

  @Get('my-feedback')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  findByUser(@Request() req: any) {
    return this.feedbackService.findByUser(req.user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  update(@Request() req: any, @Param('id') id: string, @Body() updateFeedbackDto: UpdateFeedbackDto) {
    return this.feedbackService.update(req.user.id, id, updateFeedbackDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.feedbackService.remove(req.user.id, id);
  }
}
