import { Component, ElementRef, Renderer2 } from '@angular/core';
import { Menu, NavService } from '../../services/navservice';
// import { Menu } from 'smart-webcomponents-angular';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { NavigationEnd, Router } from '@angular/router';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {
  menuItems!:Menu[];
  menuitemsSubscribe$!:Subscription
  routerSub$!:Subscription
  /** Per-page key for the global attachments panel (derived from the route). */
  attachmentKey = '';
  constructor(
    private navServices: NavService,
    private elementRef: ElementRef,private renderer:Renderer2,
    private router: Router
  ) {
    const htmlElement =
    this.elementRef.nativeElement.ownerDocument.documentElement;
    let html = document.querySelector('html');

    if (window.innerWidth <= 992) {
      html?.setAttribute(
        'data-toggled',
        html?.getAttribute('data-toggled') == 'close' ? 'close' : 'close'
      );
    }
  }
  
  ngOnInit() {

    this.menuitemsSubscribe$ = this.navServices.items.subscribe((items: any) => {
      this.menuItems = items;
    });

    this.attachmentKey = this.toAttachmentKey(this.router.url);
    this.routerSub$ = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.attachmentKey = this.toAttachmentKey(e.urlAfterRedirects || this.router.url);
      });
  }

  /** Stable per-page key from a route URL (drop query/fragment + edge slashes). */
  private toAttachmentKey(url: string): string {
    return (url || '').split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '') || 'home';
  }

  clearNavDropdown() {
    this.menuItems?.forEach((a: any) => {
      a.active = false;
      a?.children?.forEach((b: any) => {
        b.active = false;
        b?.children?.forEach((c: any) => {
          c.active = false;
        });
      });
    });
  }
  clickOnBody() {
    document.querySelector('#responsive-overlay')?.classList.remove('active');
    let html = this.elementRef.nativeElement.ownerDocument.documentElement;
    if (window.innerWidth <= 992) {
      html?.setAttribute('data-toggled', html?.getAttribute('data-toggled') == 'close' ? 'close' : 'close');
    }
    html?.removeAttribute('data-icon-text');


    this.menuItem.active = !this.menuItem.active;

    if(html.getAttribute('data-nav-layout') =='horizontal' && window.innerWidth >= 992){this.clearNavDropdown();}
  }
  menuItem = {
    active: false,
  };

  ngOnDestroy() {
    this.menuitemsSubscribe$.unsubscribe();
    this.routerSub$?.unsubscribe();
  }
  clearToggle() {
    let html = this.elementRef.nativeElement.ownerDocument.documentElement;
    html?.setAttribute('data-toggled', 'close');
    document.querySelector('#responsive-overlay')?.classList.remove('active');
  }
}
