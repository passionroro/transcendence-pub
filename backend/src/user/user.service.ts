import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { UserI } from 'src/interfaces';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private http: HttpService) {
  }

  /**
   * Finds a user in the database by its email address.
   * @param user email
   * @returns user info from database, null if not found
   */
  async findUserByEmail(userEmail: string): Promise<any> | null {
      const user = await this.prisma.user.findUnique({
          where: {
              email: userEmail,
          },
      });
      return user;
  }

  async findUserByLogin(userLogin: string): Promise<any> | null {
    const user = await this.prisma.user.findUnique({
        where: {
          login: userLogin,
        },
    });
    return user;
}

  async createUser(userInfo) {
    const user = await this.prisma.user.create({ data: userInfo });
    return user;
  }

  async ifUserExists(name: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: {
        login: name,
      },
    });

    if (user) {
      return true;
    } else {
      return false;
    }
  }

  async getUserData(token: string) {
    const api = 'https://api.intra.42.fr/v2/me?access_token=' + token;

    try {
      const response = await lastValueFrom(this.http.get(api));
      return response.data;
    } catch (error) {
      console.log('error: ', error);
      throw new Error('Could not get user info');
    }
  }

  async getUserById(id: string): Promise<UserI | null> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        friends: true,
        chats: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      createdAt: user.createdAt,
      login: user.login,
      email: user.email,
      status: user.status,
      friends: user.friends,
      chats: user.chats,
      socketId: user.socketId,
    };
  }
  
  async updateUserStatus(id: number, status: string) {
    await this.prisma.user.update({
      where: {
        id: id,
      },
      data: {
        status: status,
      },
    });
  }

  async getUserStatus(id: number): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: id,
      },
    });

    if (!user) {
      return 'offline';
    }

    return user.status;
  }

  async getAllUsers(): Promise<UserI[]> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        login: true,
        status: true,
      },
    });

    return users;
  }

  async updateUserSocketId(id: string, socketId: string) {
    await this.prisma.user.update({
      where: {
        id: parseInt(id),
      },
      data: {
        socketId: socketId,
      },
    });
  }
}
