import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from 'prisma-client-custom';

@Injectable()
export class BlogService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, userId: string) {
    // Ideally fetch user name if author is meant to be a name, 
    // but assuming it's ID or passed in data for now. 
    // If data.author is not provided, use userId.
    return this.prisma.blogPost.create({
      data: {
        ...data,
        author: data.author || userId, 
      },
    });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    published?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { page = 1, limit = 10, search, published, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    if (published !== undefined) {
      where.isPublished = published;
    }

    const [posts, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      data: posts,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException(`Blog post with ID ${id} not found`);
    }

    return post;
  }

  async findOneBySlug(slug: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
    });

    if (!post || !post.isPublished) {
      throw new NotFoundException(`Blog post with slug "${slug}" not found`);
    }

    return post;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.blogPost.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.blogPost.delete({
      where: { id },
    });
  }
}
