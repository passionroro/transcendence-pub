import { Injectable, Req, Res } from '@nestjs/common';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3 } from "@aws-sdk/client-s3";
import { Request, Response } from 'express';
import { Readable } from 'stream';
import { PrismaService } from 'src/prisma/prisma.service';
import { AvatarGateway } from './avatar.gateway';

/* these functions handle the upload and deletion of files to/from the AWS S3 bucket */

@Injectable()
export class AvatarService {
  //bucket details
  AWS_S3_BUCKET = 'transcedence';
  s3 = new S3({
    region: 'eu-central-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  constructor(
    private prisma: PrismaService,
    private socket: AvatarGateway) {
  }

  async uploadFile(@Req() req: Request, file: Express.Multer.File) {
    // check that the file is .jpg and not too big
    if (file.mimetype !== 'image/jpeg') {
      return { err: 'File must be .jpg' };
    }
    if (file.size > 500000) {
      return { err: 'File too big' };
    }
  
    const newFileName = `${(req.user as any).sub}.jpg`;

    const response = await this.s3_upload(
      file.buffer,
      this.AWS_S3_BUCKET,
      newFileName,
      file.mimetype,
    );

    if ('err' in response) {
      console.log(response.err);
      return { err: "Couldn't upload avatar" };
    } else {
      await this.prisma.user.update({
        where: { id: (req.user as any).sub },
        data: { avatar: true },
      });

      this.socket.emitRefreshValues();
      return { msg: 'Avatar uploaded successfully' };
    }
  }

  async s3_upload(file, bucket, name, mimetype) {
    const params = {
      Bucket: bucket,
      Key: String(name),
      Body: file,
      ACL: 'public-read',
      ContentType: mimetype,
      ContentDisposition: 'inline',
      CreateBucketConfiguration: {
        LocationConstraint: 'eu-central-1',
      },
    };

    try {
      let s3Response = await this.s3.send(new PutObjectCommand(params));
      return s3Response;
    } catch (e) {
      console.log(e);
      return { err: `Failed to upload file: ${e.message}` }
    }
  }

  async fetchAvatarById(id: string, @Res() res: Response) {
    const params = {
      Bucket: this.AWS_S3_BUCKET,
      Key: `${id}.jpg`,
    };
  
    const user = await this.prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (user.avatar === false) {
      return res.status(204).send('Image not found');
    }
  
    try {
      const s3Object = await this.s3.send(new GetObjectCommand(params));
      
      res.set({
        'Content-Type': s3Object.ContentType,
        'Content-Length': String(s3Object.ContentLength),
        'Content-Disposition': 'inline',
      });
      
      (s3Object.Body as Readable).pipe(res);
    } catch (e) {
      console.error(e);
      return res.status(204).send('Image not found');
    }
  }
  
  async fetchFile(@Req() req: Request, @Res() res: Response) {
    const params = {
      Bucket: this.AWS_S3_BUCKET,
      Key: `${(req.user as any).sub}.jpg`,
    };

    const user = await this.prisma.user.findUnique({ where: { id: (req.user as any).sub } });
    if (user.avatar === false) {
      return ;
    }

    try {
      const s3Object = await this.s3.send(new GetObjectCommand(params));

      res.set({
        'Content-Type': s3Object.ContentType,
        'Content-Length': String(s3Object.ContentLength),
        'Content-Disposition': 'inline',
      });

      (s3Object.Body as Readable).pipe(res);
    } catch (e) {
      console.log(e);
    }
  }

  async deleteFile(@Req() req: Request) {
    const params = {
      Bucket: this.AWS_S3_BUCKET,
      Key: `${(req.user as any).sub}.jpg`,
    };

    try {
      const s3Response = await this.s3.send(new DeleteObjectCommand(params));
      await this.prisma.user.update({
        where: { id: (req.user as any).sub },
        data: { avatar: false },
      });

      this.socket.emitRefreshValues();
      return { msg: 'Avatar deleted successfully' };
    }
    catch (e) {
      console.log(e);
      return { err: `Failed to delete file: ${e.message}` }
    }
  }
}
