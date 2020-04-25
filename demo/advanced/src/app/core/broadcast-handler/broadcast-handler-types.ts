export type ChannelAction =
  | 'open'
  | 'need data'
  | 'send next'
  | 'overwrite data'
  | 'reset'
  | 'add'
  | 'tab closed';

export interface ChannelPacket extends ChannelPacketInternal {
  data?: unknown | null; // the message content
  action?: ChannelAction | null;
}

/** Used internally only by the BroadcastHandlerService */
export interface ChannelPacketInternal {
  senderId?: string;
  messageId?: number; // auto added by broadcast service (used for ack)
  targetId?: string | null; // is of receiver if needed. Used for acknowledgingPreviousMessage by setting targetId to masters id
  needAck?: boolean; // if a ack should be returned. Is set automatically
  acknowledgingPreviousMessage?: boolean | null; // slave response true on this to signal that they received
}
