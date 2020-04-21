import { Component, OnInit, NgZone } from '@angular/core';
import { Route, ActivatedRoute, Router } from '@angular/router';
import { CardService } from '../core/card.service';
import { BroadcastHandlerService } from '../core/broadcast-handler/broadcast-handler.service';
import { Card } from '../shared/models/card.interface';
import { BroadcastChannelName } from '../core/broadcast-handler/broadcast-channel-name.enum';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoremIpsum } from 'lorem-ipsum';

@Component({
  selector: 'app-card-details-page',
  templateUrl: './card-details-page.component.html',
  styleUrls: ['./card-details-page.component.scss'],
})
export class CardDetailsPageComponent implements OnInit {
  activeCard: Card;
  content: string;

  constructor(
    private activatedRoute: ActivatedRoute,
    private cardService: CardService,
    private broadcastHandlerService: BroadcastHandlerService,
    private router: Router,
    private ngZone: NgZone,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const lorem = new LoremIpsum({
      sentencesPerParagraph: {
        max: 6,
        min: 5,
      },
      wordsPerSentence: {
        max: 12,
        min: 11,
      },
    });

    this.activatedRoute.paramMap.subscribe((params) => {
      this.activeCard = this.cardService.cards[params.get('id')];
      this.content = lorem.generateParagraphs(4);
    });

    this.broadcastHandlerService.getChannelMessages(BroadcastChannelName.OpenCard).subscribe((message) => {
      if (message.action === 'open') {
        this.ngZone.run(() => {
          this.router.navigate(['/', message.data]);
          this.snackBar.open('💻 Synced 💻', 'Close', { duration: 1000 });
        });
      }
    });
  }

  addCard() {
    this.broadcastHandlerService.sendMessage(BroadcastChannelName.AddCard, {
      action: 'add',
      data: 'Some new card'
    });
  }
}
