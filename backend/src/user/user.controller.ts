import { Controller, Get, Param, Post, Req, UseGuards, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from 'src/auth/guard';
import { Request } from 'express';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) { }

  @Get('data/:token')
  async getUserData(@Param('token') token: string) {
    return await this.userService.getUserData(token);
  }

  @Get('get-all')
  @UseGuards(AuthGuard)
  async getAllUsers() {
    return await this.userService.getAllUsers();
  }

  // gets the user's data by id; 'user/user/1'
  @Get('user/:id')
  @UseGuards(AuthGuard)
  async getUserById(@Param('id') id: string) {
    return await this.userService.getUserById(id);
  }

  // gets the user's data by name; 'user/name/username'
  @Get(':name')
  async getUser(@Param('name') name: string) {
    return await this.userService.ifUserExists(name);
  }
}
