import { Injectable } from '@angular/core';
import { Card } from '../shared/models/card.interface';

@Injectable({
  providedIn: 'root',
})
export class CardService {
  cards: Card[] = [];

  constructor() {
    for (let i = 0; i < 12; i++) {
      this.cards.push({
        id: i,
        name: 'Pondus ' + (i + 1),
        imageName: i + '.jpg',
        content: `Lorem ipsum dolor sit amet consectetur adipisicing elit. Magni suscipit alias dolor! Laborum facere quo rem quis
        labore ipsum sint accusamus magnam rerum, ducimus et repudiandae doloremque ad qui iure?`,
      });
    }
  }
}
