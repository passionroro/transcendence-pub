import { ChatI, MessageI } from ".";

export interface UserRequestI {
  login: string,
  email: string,
  sub: number,
  iat: number,
}

export interface UserI {
  id?:            number;
  createdAt?:     Date;
  login?:         string;
  email?:         string;
  status?:        string;
  avatar?:        boolean;
  tfaEnabled?:    boolean;
  tfaVerified?:   boolean;
  friends?:       UserI[];
  chats?:         ChatI[];
  adminChats?:    ChatI[];
  rootChats?:     ChatI[];
  invitedChats?:  ChatI[];
  messages?:      MessageI[];
  sentRequests?:  UserI[];
  receivedRequests?: UserI[];
  socketId?:      string;
  blockedUsers?:  UserI[];
}