import { ChatI, MessageI } from ".";

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
  avatarUrl?:     string;
  chatRank?:      string;
  adminChats?:    ChatI[];
  rootChats?:     ChatI[];
  invitedChats?:  ChatI[];
  messages?:      MessageI[];
  receivedRequests?: UserI[];
  socketId?:      string;
  blockedUsers?:  UserI[];
}