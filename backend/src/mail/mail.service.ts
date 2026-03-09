import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

/** Shared queue job options – avoids repeating config in every add() call */
const QUEUE_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: true,
};

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(
    private configService: ConfigService,
    @InjectQueue('mail-queue') private readonly mailQueue: Queue,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<boolean>('SMTP_SECURE') || false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  //  Core send (single source of truth for actual SMTP call)
  // ─────────────────────────────────────────────────────────────

  async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      const from =
        this.configService.get<string>('SMTP_FROM') ||
        '"BusBook" <noreply@busbook.com>';
      await this.transporter.sendMail({ from, to, subject, html });
      this.logger.log(`Email sent to ${to}: ${subject}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${subject}`, error.stack);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  Immediate senders (for critical emails that bypass queue)
  // ─────────────────────────────────────────────────────────────

  async sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
    return this.sendMail(
      to,
      'Welcome to BusBook!',
      this.templateWelcome(userName),
    );
  }

  async sendPasswordResetEmail(
    to: string,
    userName: string,
    token: string,
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    return this.sendMail(
      to,
      'Reset Your BusBook Password',
      this.templatePasswordReset(userName, resetLink),
    );
  }

  async sendBookingConfirmation(
    to: string,
    bookingDetails: BookingEmailDetails,
  ): Promise<boolean> {
    return this.sendMail(
      to,
      `Booking Confirmed – ${bookingDetails.id}`,
      this.templateBookingConfirmation(bookingDetails),
    );
  }

  async sendBookingCancellation(
    to: string,
    bookingDetails: Pick<BookingEmailDetails, 'id' | 'userName'>,
    refundAmount: number,
  ): Promise<boolean> {
    return this.sendMail(
      to,
      `Booking Cancelled – ${bookingDetails.id}`,
      this.templateBookingCancellation(bookingDetails, refundAmount),
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  Queue dispatchers (for non-critical async emails)
  // ─────────────────────────────────────────────────────────────

  async queueWelcomeEmail(to: string, userName: string): Promise<void> {
    await this.mailQueue.add('welcome-email', { to, userName }, QUEUE_JOB_OPTIONS);
    this.logger.log(`Queued welcome-email for ${to}`);
  }

  async queueBookingConfirmation(
    to: string,
    bookingDetails: BookingEmailDetails,
  ): Promise<void> {
    await this.mailQueue.add(
      'booking-confirmation',
      { to, bookingDetails },
      QUEUE_JOB_OPTIONS,
    );
    this.logger.log(`Queued booking-confirmation for ${to}`);
  }

  async queueBookingCancellation(
    to: string,
    bookingDetails: Pick<BookingEmailDetails, 'id' | 'userName'>,
    refundAmount: number,
  ): Promise<void> {
    await this.mailQueue.add(
      'booking-cancellation',
      { to, bookingDetails, refundAmount },
      QUEUE_JOB_OPTIONS,
    );
    this.logger.log(`Queued booking-cancellation for ${to}`);
  }

  // ─────────────────────────────────────────────────────────────
  //  Email templates (centralised, DRY)
  // ─────────────────────────────────────────────────────────────

  private templateWelcome(userName: string): string {
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <h2>Welcome, ${userName}! 🚌</h2>
        <p>Thank you for joining BusBook. You can now search routes, book tickets, and manage your journeys.</p>
        <p>Happy Travelling!</p>
        <p style="color:#888;font-size:12px">BusBook Team</p>
      </div>`;
  }

  private templatePasswordReset(userName: string, resetLink: string): string {
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <h2>Password Reset Request</h2>
        <p>Hi ${userName},</p>
        <p>We received a request to reset your password. Click the button below to proceed:</p>
        <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">Reset Password</a>
        <p>This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
        <p style="color:#888;font-size:12px">BusBook Team</p>
      </div>`;
  }

  private templateBookingConfirmation(d: BookingEmailDetails): string {
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <h2>✅ Booking Confirmed</h2>
        <p>Dear ${d.userName},</p>
        <p>Your booking from <strong>${d.from}</strong> to <strong>${d.to}</strong> is confirmed.</p>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;border:1px solid #eee"><strong>Booking ID</strong></td><td style="padding:8px;border:1px solid #eee">${d.id}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee"><strong>Date</strong></td><td style="padding:8px;border:1px solid #eee">${d.date}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee"><strong>Time</strong></td><td style="padding:8px;border:1px solid #eee">${d.time}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee"><strong>Seats</strong></td><td style="padding:8px;border:1px solid #eee">${d.seats}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee"><strong>Total Amount</strong></td><td style="padding:8px;border:1px solid #eee">₹${d.amount}</td></tr>
        </table>
        <p>Thank you for choosing BusBook!</p>
      </div>`;
  }

  private templateBookingCancellation(
    d: Pick<BookingEmailDetails, 'id' | 'userName'>,
    refundAmount: number,
  ): string {
    const refundNote =
      refundAmount > 0
        ? `<p>A refund of <strong>₹${refundAmount}</strong> has been initiated and will reflect in 5–7 business days.</p>`
        : `<p>No refund is applicable as per our cancellation policy.</p>`;
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <h2>Booking Cancelled</h2>
        <p>Dear ${d.userName},</p>
        <p>Your booking <strong>${d.id}</strong> has been cancelled as requested.</p>
        ${refundNote}
        <p>We hope to serve you again soon.</p>
      </div>`;
  }
}

// ─────────────────────────────────────────────────────────────
//  Shared types
// ─────────────────────────────────────────────────────────────

export interface BookingEmailDetails {
  id: string;
  userName: string;
  from: string;
  to: string;
  date: string;
  time: string;
  seats: number;
  amount: number;
}
