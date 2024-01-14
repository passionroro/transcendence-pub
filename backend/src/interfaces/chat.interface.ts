import { MessageI, UserI, MutedUserI } from '.';

export interface ChatI {
  id?:        number;
  creatorId?: number;
  name?:      string;
  type?:      string;
  password?:  string;
  rootUser?:  UserI;
  users?:     UserI[];
  admins?:    UserI[];
  invited?:   UserI[];
  kicked?:    UserI[];
  banned?:    UserI[];
  muted?:     MutedUserI[];
  messages?:  MessageI[];
  createdAt?: Date;
  updatedAt?: Date;
  avatarUrl?: string;
}