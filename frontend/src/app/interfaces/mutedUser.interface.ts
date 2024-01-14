import { UserI, ChatI } from '.';

export interface MutedUserI {
  id?:              number;            
  user?:            UserI;
  userId?:         number;
  chat?:            ChatI;
  chatId?:         number;
  muteExpiration?:  Date;
}