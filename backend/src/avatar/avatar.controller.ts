import {
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Req,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AvatarService } from './avatar.service';
import { Response, Request } from 'express';
import { AuthGuard } from 'src/auth/guard';

@Controller('avatar')
@UseGuards(AuthGuard)
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@Req() req: Request, @UploadedFile() file: Express.Multer.File) {
    return this.avatarService.uploadFile(req, file);
  }

  @Get('fetchbyid/:id')
  async fetchAvatarById(@Param('id') id: string ,@Res() res: Response) {
    return this.avatarService.fetchAvatarById(id, res);
  }

  @Get('fetch')
  async fetchFile(@Req() req: Request, @Res() res: Response) {
    return this.avatarService.fetchFile(req, res);
  }

  @Delete('delete')
  async deleteFile(@Req() req: Request) {
    return this.avatarService.deleteFile(req);
  }
}
