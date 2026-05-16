export type Protocol = 'source' | 'minecraft';

export type ServerConfig = {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: Protocol;
  hidden?: boolean;
};
