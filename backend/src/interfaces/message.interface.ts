import { ChatI, UserI } from ".";

export interface MessageI {
  id:         number;
  createdAt?: Date;
  content?:   string;
  chat?:      ChatI;
  user?:      UserI;
  avatarUrl?: string;
}