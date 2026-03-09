import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, Request, InternalServerErrorException, Query } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Request() req, @Body() createFeedbackDto: CreateFeedbackDto) {
    return this.feedbackService.create(req.user.id, createFeedbackDto);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard)
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    try {
      const parsedPage = page ? Number(page) : undefined;
      const parsedLimit = limit ? Number(limit) : undefined;
      return await this.feedbackService.findAll({ page: parsedPage, limit: parsedLimit });
    } catch (error) {
      console.error('Error in findAll:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  @Post(':id/reply')
  @UseGuards(JwtAuthGuard)
  reply(@Param('id') id: string, @Body() body: { reply: string }) {
    return this.feedbackService.reply(id, body.reply);
  }

  @Get('public')
  findAllPublic() {
    return this.feedbackService.findAllPublic();
  }

  @Get('provider/my-reviews')
  @UseGuards(JwtAuthGuard)
  findMyReviews(@Request() req) {
    return this.feedbackService.findMyReviews(req.user.id);
  }

  @Get('provider/:id')
  findByProvider(@Param('id') id: string) {
    return this.feedbackService.findByProvider(id);
  }

  @Get('my-feedback')
  @UseGuards(JwtAuthGuard)
  findByUser(@Request() req) {
    return this.feedbackService.findByUser(req.user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Request() req, @Param('id') id: string, @Body() updateFeedbackDto: UpdateFeedbackDto) {
    return this.feedbackService.update(req.user.id, id, updateFeedbackDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Request() req, @Param('id') id: string) {
    return this.feedbackService.remove(req.user.id, id);
  }
}

import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, Request, InternalServerErrorException, Query, Logger } from '@nestjs/common';
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
  create(@Request() req, @Body() createFeedbackDto: CreateFeedbackDto) {
    return this.feedbackService.create(req.user.id, createFeedbackDto);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard)
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    try {
      const parsedPage = page ? Number(page) : undefined;
      const parsedLimit = limit ? Number(limit) : undefined;
      return await this.feedbackService.findAll({ page: parsedPage, limit: parsedLimit });
    } catch (error) {
      this.logger.error('Error in findAll:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  @Post(':id/reply')
  @UseGuards(JwtAuthGuard)
  reply(@Param('id') id: string, @Body() body: { reply: string }) {
    return this.feedbackService.reply(id, body.reply);
  }

  @Get('public')
  findAllPublic() {
    return this.feedbackService.findAllPublic();
  }

  @Get('provider/my-reviews')
  @UseGuards(JwtAuthGuard)
  findMyReviews(@Request() req) {
    return this.feedbackService.findMyReviews(req.user.id);
  }

  @Get('provider/:id')
  findByProvider(@Param('id') id: string) {
    return this.feedbackService.findByProvider(id);
  }

  @Get('my-feedback')
  @UseGuards(JwtAuthGuard)
  findByUser(@Request() req) {
    return this.feedbackService.findByUser(req.user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Request() req, @Param('id') id: string, @Body() updateFeedbackDto: UpdateFeedbackDto) {
    return this.feedbackService.update(req.user.id, id, updateFeedbackDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Request() req, @Param('id') id: string) {
    return this.feedbackService.remove(req.user.id, id);
  }
}
