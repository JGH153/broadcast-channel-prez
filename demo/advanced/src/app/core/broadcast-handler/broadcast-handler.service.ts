import { Injectable, NgZone } from '@angular/core';
import { ChannelPacket, ChannelAction } from './broadcast-handler-types';
import {
  Observable,
  interval,
  race,
  Subject,
  Subscription,
  Subscriber,
} from 'rxjs';
import { take, tap, filter, finalize } from 'rxjs/operators';

// internal use only
interface ActiveChannel {
  messages: Subject<ChannelPacket>;
  subscription: Subscription;
  channel: BroadcastChannel;
}

type BroadcastHandlerChannelName = string;

/**
 * A service that wraps RxJS around broadcast channel.
 * Send and receive messages between tabs with the public functions.
 * NB! It's not possible to both send and receive in the same tab.
 * ACK(Acknowledgement) is used for confirming that a sendt message was received.
 */

@Injectable({
  providedIn: 'root',
})
export class BroadcastHandlerService {
  readonly ackWaitTime = 500; // consider changing if unstable
  readonly ackWaitTimeExtra = 2000;

  private mySenderId = (Math.random() * 10000000).toString();

  private readonly channelPrefix = 'BHSC-';
  private activeChannels: ActiveChannel[] = [];

  constructor(private ngZone: NgZone) {}

  /** Filters out ACK messages
   * Closes underlying channel on unsubscribe
   * Will only receive messages when tab is visible
   */
  getChannelMessages(
    channelName: BroadcastHandlerChannelName,
    action?: ChannelAction
  ): Observable<ChannelPacket> {
    return this.getChannelObject(channelName).messages.pipe(
      filter((message) => !message.acknowledgingPreviousMessage),
      filter((message) => {
        if (!action) {
          return true;
        }
        return message.action === action;
      }),
      finalize(() => {
        this.closeChannel(channelName);
      })
    );
  }

  /** Send message without checking if it was received */
  sendMessage(
    channelName: BroadcastHandlerChannelName,
    message: ChannelPacket,
    setNewMessageId: boolean = true
  ): void {
    const updatedMessage = {
      ...message,
      needAck: false,
    };
    if (setNewMessageId) {
      updatedMessage.messageId = this.getRandId();
    }
    this.getChannel(channelName).postMessage(updatedMessage);
  }

  /** Send message and check if it was received
   * ACK(Acknowledgement) is used for confirming that a sendt message was received.
   * Use extraLongWait if message is sendt at script startup (under heavy load)
   */
  sendMessageWithAck(
    channelName: BroadcastHandlerChannelName,
    message: ChannelPacket,
    sendingAsMaster = true,
    extraLongWait = false
  ): Observable<boolean> {
    const updatedMessage = {
      ...message,
      needAck: true,
      senderId: this.getMySenderId(sendingAsMaster),
      messageId: this.getRandId(),
    };
    // give time for sub to response
    requestAnimationFrame(() => {
      this.getChannel(channelName).postMessage(updatedMessage);
    });
    return this.getSendMessageAck(channelName, updatedMessage, extraLongWait);
  }

  /** Close one underlying channel. Usually better to just unsubscribe from the getChannelMessages */
  private closeChannel(channelName: BroadcastHandlerChannelName) {
    this.getChannelObject(channelName).subscription.unsubscribe();
    this.activeChannels = this.activeChannels.filter(
      (channel) => channel.channel.name !== this.getChannelFullName(channelName)
    );
  }

  /** Close all underlying channels */
  private closeAllChannels() {
    this.activeChannels.forEach((channel) =>
      channel.subscription.unsubscribe()
    );
    this.activeChannels = [];
  }

  private getMySenderId(asMaster: boolean) {
    return asMaster ? 'master-' + this.mySenderId : 'slave-' + this.mySenderId;
  }

  private getRandId() {
    return Math.floor(Math.random() * 10000000);
  }

  /** Only ACK messages */
  private getChannelMessagesAck(
    channelName: BroadcastHandlerChannelName
  ): Observable<ChannelPacket> {
    return this.getChannelObject(channelName).messages.pipe(
      filter((message) => {
        return message.acknowledgingPreviousMessage;
      })
    );
  }

  /** Will next false if ack takes more time than waitTime */
  private getSendMessageAck(
    channelName: BroadcastHandlerChannelName,
    sentMessage: ChannelPacket,
    extraLongWait: boolean
  ): Observable<boolean> {
    const waitTime = extraLongWait ? this.ackWaitTimeExtra : this.ackWaitTime;
    return new Observable((observer) => {
      race(
        this.getChannelMessagesAck(channelName).pipe(
          filter((ackMessage: ChannelPacket) => {
            if (
              ackMessage.targetId === sentMessage.senderId &&
              ackMessage.messageId === sentMessage.messageId
            ) {
              observer.next(true);
              return true;
            }
            return false;
          })
        ),
        interval(waitTime).pipe(
          tap(() => {
            observer.next(false);
          })
        )
      )
        .pipe(take(1))
        .subscribe(() => observer.complete());
    });
  }

  /** gets open if present or returns a new and stores it */
  private getChannel(
    channelName: BroadcastHandlerChannelName
  ): BroadcastChannel {
    return this.getChannelObject(channelName).channel;
  }

  private getChannelFullName(channelName: BroadcastHandlerChannelName): string {
    return this.channelPrefix + channelName;
  }

  private getChannelObject(
    channelName: BroadcastHandlerChannelName
  ): ActiveChannel {
    const channelFullName: string = this.getChannelFullName(channelName);
    const cachedChannel: ActiveChannel | undefined = this.activeChannels.find(
      (current) => current.channel.name === channelFullName
    );
    let channelObject: ActiveChannel;

    if (!cachedChannel) {
      channelObject = this.createNewChannel(channelFullName, channelName);
    } else {
      channelObject = cachedChannel;
    }
    return channelObject;
  }

  private createNewChannel(
    channelFullName: string,
    channelName: BroadcastHandlerChannelName
  ): ActiveChannel {
    const channel: BroadcastChannel = new BroadcastChannel(channelFullName);
    const messagesSubject = new Subject<ChannelPacket>();

    // emitting messages one time via a subject as onmessage only emits once for each channel
    const subscription = this.getChannelRawMessages(
      channel,
      channelName
    ).subscribe((message) => {
      // tell angular so change detection is handled properly
      this.ngZone.run(() => {
        messagesSubject.next(message);
      });
    });

    const channelObject: ActiveChannel = {
      channel,
      messages: messagesSubject,
      subscription,
    };
    this.activeChannels.push({
      channel,
      messages: messagesSubject,
      subscription,
    });
    return channelObject;
  }

  private getChannelRawMessages(
    channel: BroadcastChannel,
    channelName: BroadcastHandlerChannelName
  ): Observable<ChannelPacket> {
    return new Observable((observer: Subscriber<ChannelPacket>) => {
      channel.onmessage = (messageEvent: MessageEvent) => {
        if (document.visibilityState === 'visible') {
          this.onNewChannelRawMessage(messageEvent, observer, channelName);
        }
      };
      channel.onmessageerror = (error) => {
        console.warn('onmessageerror: ', error);
        observer.error(error);
      };
      return () => channel.close();
    });
  }

  private onNewChannelRawMessage(
    messageEvent: MessageEvent,
    observer: Subscriber<ChannelPacket>,
    channelName: BroadcastHandlerChannelName
  ) {
    const receivedMessage: ChannelPacket = messageEvent.data;
    if (
      receivedMessage.needAck &&
      !receivedMessage.acknowledgingPreviousMessage
    ) {
      this.respondAck(receivedMessage, channelName);
    }
    observer.next(receivedMessage);
  }

  private respondAck(
    receivedMessage: ChannelPacket,
    channelName: BroadcastHandlerChannelName
  ) {
    const acknowledgementMessage: ChannelPacket = {
      ...receivedMessage,
      acknowledgingPreviousMessage: true,
      targetId: receivedMessage.senderId,
      senderId: this.getMySenderId(false),
    };
    this.sendMessage(channelName, acknowledgementMessage, false);
  }
}
