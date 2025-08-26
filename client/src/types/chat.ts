export type User = {
  _id: string;
  displayName: string;
  image: string;
};

export type Room = {
  _id: string;
  name: string;
  number?: string;
  users: User[];
};

export type Message = {
  _id: string;
  text: string;
  user: User;
  room: string;
  createdAt: string;
};
