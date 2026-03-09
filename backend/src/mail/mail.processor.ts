import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { MailService } from './mail.service';

@Processor('mail-queue')
export class MailProcessor {
    private readonly logger = new Logger(MailProcessor.name);

    constructor(private readonly mailService: MailService) { }

    @Process()
    async process(job: Job<any>): Promise<any> {
        this.logger.log(`Processing job ${job.id} of type ${job.name}...`);
        let result = false;

        try {
            switch (job.name) {
                case 'booking-confirmation':
                    result = await this.mailService.sendBookingConfirmation(job.data.to, job.data.bookingDetails);
                    break;
                case 'booking-cancellation':
                    result = await this.mailService.sendBookingCancellation(job.data.to, job.data.bookingDetails, job.data.refundAmount);
                    break;
                case 'welcome-email':
                    result = await this.mailService.sendWelcomeEmail(job.data.to, job.data.userName);
                    break;
                case 'generic-mail':
                    result = await this.mailService.sendMail(job.data.to, job.data.subject, job.data.html);
                    break;
                default:
                    this.logger.warn(`Unknown job type: ${job.name}`);
                    throw new Error(`Unknown job type: ${job.name}`);
            }

            if (result) {
                this.logger.log(`Job ${job.id} completed successfully.`);
            } else {
                throw new Error('MailService returned false during send attempt.');
            }
        } catch (error) {
            this.logger.error(`Failed to process job ${job.id}: ${error.message}`, error.stack);
            throw error; // Let BullMQ handle retries
        }
    }
}
