import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CardsPageComponent } from './cards-page/cards-page.component';
import { CardDetailsPageComponent } from './card-details-page/card-details-page.component';


const routes: Routes = [
  {
    path: '',
    component: CardsPageComponent
  },
  {
    path: ':id',
    component: CardDetailsPageComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
