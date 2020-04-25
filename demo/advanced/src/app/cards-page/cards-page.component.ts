import { Component, OnInit } from '@angular/core';
import { CardService } from '../core/card.service';
import { Card } from '../shared/models/card.interface';
import { BroadcastHandlerService } from '../core/broadcast-handler/broadcast-handler.service';
import { BroadcastChannelName } from '../core/broadcast-handler/broadcast-channel-name.enum';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-cards-page',
  templateUrl: './cards-page.component.html',
  styleUrls: ['./cards-page.component.scss'],
})
export class CardsPageComponent implements OnInit {
  cards: Card[] = [];

  constructor(
    private cardService: CardService,
    private broadcastHandlerService: BroadcastHandlerService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cards = this.cardService.cards;

    this.broadcastHandlerService
      .getChannelMessages(BroadcastChannelName.AddCard, 'add')
      .subscribe((message) => {
        this.snackBar.open('Adding card', 'Close', { duration: 1000 });
      });

    this.broadcastHandlerService
      .getChannelMessages(BroadcastChannelName.TabClosed, 'tab closed')
      .subscribe((message) => {
        this.snackBar.open('Tab closed 👋', 'Close', { duration: 2000 });
      });
  }

  cardClicked(cardId: number) {
    this.broadcastHandlerService
      .sendMessageWithAck(BroadcastChannelName.OpenCard, {
        action: 'open',
        data: cardId,
      })
      .subscribe((received: boolean) => this.onTabResponse(received, cardId));
  }

  onTabResponse(received: boolean, cardId: number) {
    if (received) {
      this.snackBar.open('💻 Synced 💻', 'Close', { duration: 1000 });
    } else {
      window.open(window.location.href + '/' + cardId, '_blank');
    }
  }
}
