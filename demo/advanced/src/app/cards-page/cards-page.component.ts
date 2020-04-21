import { Component, OnInit, NgZone } from '@angular/core';
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
    private snackBar: MatSnackBar,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.cards = this.cardService.cards;

    this.broadcastHandlerService.getChannelMessages(BroadcastChannelName.AddCard).subscribe(message => {
      this.ngZone.run(() => {
        this.snackBar.open('Adding card', 'Close', { duration: 1000 });
      });
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
    this.ngZone.run(() => {
      if (received) {
        this.snackBar.open('💻 Synced 💻', 'Close', { duration: 1000 });
      } else {
        window.open(window.location.href + '/' + cardId, '_blank');
      }
    });
  }

}
