import { Component, ElementRef, OnInit, Renderer2, inject } from '@angular/core';
import { Menu, NavService } from '../../services/navservice';
import { SwitcherComponent } from '../switcher/switcher.component';
import { NgbModal, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { AppStateService } from '../../services/app-state.service';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { TranslateService } from '@ngx-translate/core';

interface Item {
  id: number;
  name: string;
  type: string;
  title: string;
  // Add other properties as needed
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  cartItemCount: number = 5;
  notificationCount: number = 5;
  public isCollapsed = true;
  collapse: any;
  closeResult = '';
  themeType: string | undefined;
  
  // User information
  userFirstName: string = '';
  userLastName: string = '';
  DatabaseName: string = '';

  userTaxType: string = '';

  selectedItem: string | null = 'selectedItem';
  isOpen: boolean = false;
  currentFlag: string = './assets/images/flags/uae_flag.jpg'; // Default to Arabic flag

  constructor(
    private appStateService: AppStateService,
    public navServices: NavService,
    private elementRef: ElementRef,
    public renderer: Renderer2,
    public modalService: NgbModal,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private translateService: TranslateService
  ) {
    this.localStorageBackUp();
    this.setDefaultLanguage();
    this.loadUserInfo();
  }
  
  /**
   * Load user information from JWT token
   */
  private loadUserInfo(): void {

    try {
      //const token = this.authService.getToken();
      //if (token) {
        // Extract payload from JWT token (part between first and second dots)
        //const tokenParts = token.split('.');
        //if (tokenParts.length === 3) {
        //  const payload = JSON.parse(atob(tokenParts[1]));

        const user = this.authService.currentUserValue;
          if (user) {            
            this.userFirstName = user.DeliveryName || 'Guest';
            this.DatabaseName  = user.DatabaseName;
          }
          // Extract user information
          
          //this.userLastName = payload['User_LName'] || '';
       // }
      //}
      
      // If user info is not available, set a default value
      //if (!this.userFirstName) {
      //  this.userFirstName = 'Guest';
    }
     catch (error) {
      console.error('Error parsing JWT token:', error);
      //this.userFirstName = 'Guest';
    }
  }


  private offcanvasService = inject(NgbOffcanvas);

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }

  handleItemClick(title: string) {
    this.selectedItem = title;
    this.isOpen = false;
    localStorage.setItem('selectedItem', title);
  }

  open() {
    this.offcanvasService.open(SwitcherComponent, {
      position: 'end',
      scroll: true,
    });
  }

  openModal(content: any) {
    this.modalService.open(content);
  }

  openSearch(search: any) {
    // this.modalService.open(search);
  }

  toggleSidebar() {
    let html = this.elementRef.nativeElement.ownerDocument.documentElement;
    if (html?.getAttribute('data-toggled') == 'true') {
      document.querySelector('html')?.getAttribute('data-toggled') ==
        'icon-overlay-close';
    } else if (html?.getAttribute('data-nav-style') == 'menu-click') {
      html?.setAttribute(
        'data-toggled',
        html?.getAttribute('data-toggled') == 'menu-click-closed'
          ? ''
          : 'menu-click-closed'
      );
    } else if (html?.getAttribute('data-nav-style') == 'menu-hover') {
      html?.setAttribute(
        'data-toggled',
        html?.getAttribute('data-toggled') == 'menu-hover-closed'
          ? ''
          : 'menu-hover-closed'
      );
    } else if (html?.getAttribute('data-nav-style') == 'icon-click') {
      html?.setAttribute(
        'data-toggled',
        html?.getAttribute('data-toggled') == 'icon-click-closed'
          ? ''
          : 'icon-click-closed'
      );
    } else if (html?.getAttribute('data-nav-style') == 'icon-hover') {
      html?.setAttribute(
        'data-toggled',
        html?.getAttribute('data-toggled') == 'icon-hover-closed'
          ? ''
          : 'icon-hover-closed'
      );
    } else if (html?.getAttribute('data-vertical-style') == 'overlay') {
      html?.setAttribute('data-vertical-style', 'overlay');
      html?.setAttribute(
        'data-toggled',
        html?.getAttribute('data-toggled') == 'icon-overlay-close'
          ? ''
          : 'icon-overlay-close'
      );
    } else if (html?.getAttribute('data-vertical-style') == 'overlay') {
      document.querySelector('html')?.getAttribute('data-toggled') != null
        ? document.querySelector('html')?.removeAttribute('data-toggled')
        : document
            .querySelector('html')
            ?.setAttribute('data-toggled', 'icon-overlay-close');
    } else if (html?.getAttribute('data-vertical-style') == 'closed') {
      html?.setAttribute(
        'data-toggled',
        html?.getAttribute('data-toggled') == 'close-menu-close'
          ? ''
          : 'close-menu-close'
      );
    } else if (html?.getAttribute('data-vertical-style') == 'icontext') {
      html?.setAttribute(
        'data-toggled',
        html?.getAttribute('data-toggled') == 'icon-text-close'
          ? ''
          : 'icon-text-close'
      );
    } else if (html?.getAttribute('data-vertical-style') == 'detached') {
      html?.setAttribute(
        'data-toggled',
        html?.getAttribute('data-toggled') == 'detached-close'
          ? ''
          : 'detached-close'
      );
    } else if (html?.getAttribute('data-vertical-style') == 'doublemenu') {
      html?.setAttribute(
        'data-toggled',
        html?.getAttribute('data-toggled') == 'double-menu-close' &&
          document.querySelector('.slide.open')?.classList.contains('has-sub')
          ? 'double-menu-open'
          : 'double-menu-close'
      );
    }

    if (window.innerWidth <= 992) {
      html?.setAttribute(
        'data-toggled',
        html?.getAttribute('data-toggled') == 'open' ? 'close' : 'open'
      );
    }
  }

  updateTheme(theme: string) {
    // Get the current direction before changing anything
    const html = document.querySelector('html');
    const currentDir = html?.getAttribute('dir') || 'ltr';
    
    this.appStateService.updateState({ theme, menuColor: theme });
    if (theme == 'light') {
      this.appStateService.updateState({
        theme,
        themeBackground: '',
        headerColor: 'light',
        menuColor: 'light',
      });
      
      html?.style.removeProperty('--body-bg-rgb');
      html?.style.removeProperty('--body-bg-rgb2');
      html?.style.removeProperty('--light-rgb');
      html?.style.removeProperty('--form-control-bg');
      html?.style.removeProperty('--input-border');
      html?.style.removeProperty('--primary-rgb');
    }
    if (theme == 'dark') {
      this.appStateService.updateState({
        theme,
        themeBackground: '',
        headerColor: 'dark',
        menuColor: 'dark',
      });
      
      html?.style.removeProperty('--body-bg-rgb');
      html?.style.removeProperty('--body-bg-rgb2');
      html?.style.removeProperty('--light-rgb');
      html?.style.removeProperty('--form-control-bg');
      html?.style.removeProperty('--input-border');
      html?.style.removeProperty('--primary-rgb');
    }
    
    // Restore the original direction that was set before changing the theme
    html?.setAttribute('dir', currentDir);
    
    // Make sure the language flag is also consistent with the direction
    const currentLanguage = currentDir === 'rtl' ? 'ar' : 'en';
    this.currentFlag = currentDir === 'rtl' 
      ? './assets/images/flags/uae_flag.jpg' 
      : './assets/images/flags/us_flag.jpg';
  }

  localStorageBackUp() {
    let styleId = document.querySelector('#style');

    let html = document.querySelector('html');
    //Theme Color Mode:
    if (localStorage.getItem('valexHeader') == 'dark') {
      if (localStorage.getItem('valexdarktheme')) {
        const type: any = localStorage.getItem('valexdarktheme');
        html?.setAttribute('data-theme-mode', type);
        html?.setAttribute('data-header-styles', type);
        html?.setAttribute('data-menu-styles', type);
      }
      if (localStorage.getItem('valexdarktheme') == 'light') {
        const type: any = localStorage.getItem('valexdarktheme');
        html?.setAttribute('data-theme-mode', type);
        html?.setAttribute('data-header-styles', type);
        html?.setAttribute('data-menu-styles', type);
      }
    }
  }

  isCartEmpty: boolean = false;
  isNotifyEmpty: boolean = false;

  removeRow(rowId: string) {
    const rowElement = document.getElementById(rowId);
    if (rowElement) {
      rowElement.remove();
    }
    this.cartItemCount--;
    this.isCartEmpty = this.cartItemCount === 0;
  }

  removeNotify(rowId: string) {
    const rowElement = document.getElementById(rowId);
    if (rowElement) {
      rowElement.remove();
    }
    this.notificationCount--;
    this.isNotifyEmpty = this.notificationCount === 0;
  }

  handleCardClick(event: MouseEvent) {
    // Prevent the click event from propagating to the container
    event.stopPropagation();
  }

  // Search
  public menuItems!: Menu[];
  public items!: Menu[];
  public text!: string;
  public SearchResultEmpty: boolean = false;

  ngOnInit(): void {
    const storedSelectedItem = localStorage.getItem('selectedItem');
    // this.updateSelectedItem();
    // If there's no selected item stored, set a default one
    if (!storedSelectedItem) {
      this.selectedItem = 'Sales Dashboard'; // You can set any default item here
      localStorage.setItem('selectedItem', this.selectedItem);
    } else {
      this.selectedItem = storedSelectedItem;
    }
    this.navServices.items.subscribe((menuItems) => {
      this.items = menuItems;
    });
    // To clear and close the search field by clicking on body
    document.querySelector('.main-content')?.addEventListener('click', () => {
      this.clearSearch();
    });
    this.text = '';
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateSelectedItem();
      });
  }

  private updateSelectedItem() {
    const dashboard = this.activatedRoute.snapshot.firstChild?.url[0]?.path;
    this.selectedItem = dashboard
      ? dashboard.charAt(0).toUpperCase() + dashboard.slice(1) + ' Dashboard'
      : this.selectedItem;
  }

  ngOnDestroy(): void {
    const windowObject: any = window;
    let html = this.elementRef.nativeElement.ownerDocument.documentElement;
    if (windowObject.innerWidth <= '991') {
      html?.setAttribute('data-toggled', 'open');
    }
    window.addEventListener('resize', () => {
      if (localStorage.getItem('valexverticalstyles') != 'icon-text-close') {
        if (windowObject.innerWidth <= '991') {
          html?.setAttribute('data-toggled', 'open');
        } else {
          if (!(localStorage.getItem('valexverticalstyles') == 'doublemenu')) {
            html?.removeAttribute('data-toggled');
          }
        }
      } else {
        document
          .querySelector('html')
          ?.setAttribute('data-toggled', 'icon-text-close');
      }
    });

    if (windowObject.innerWidth <= '991') {
      html?.setAttribute('data-toggled', 'open');
    }
  }

  Search(searchText: string): void {
    if (!searchText) {
      this.menuItems = [];
      return;
    }
    // items array which stores the elements
    const items: Item[] = [];
    // Converting the text to lower case by using toLowerCase() and trim() used to remove the spaces from starting and ending
    searchText = searchText.toLowerCase().trim();
    this.items.filter((menuItems: Menu) => {
      // checking whether menuItems having title property, if there was no title property it will return
      if (!menuItems?.title) return false;
      //  checking wheteher menuitems type is text or string and checking the titles of menuitems
      if (
        menuItems.type === 'link' &&
        menuItems.title.toLowerCase().includes(searchText)
      ) {
        // Converting the menuitems title to lowercase and checking whether title is starting with same text of searchText
        if (menuItems.title.toLowerCase().startsWith(searchText)) {
          // If you want to get all the data with matching to letter entered remove this line(condition and leave items.push(menuItems))
          // If both are matching then the code is pushed to items array
          items.push(menuItems as Item);
        }
      }
      //  checking whether the menuItems having children property or not if there was no children the return
      if (!menuItems.children) return false;
      menuItems.children.filter((subItems: Menu) => {
        if (!subItems?.title) return false;
        if (
          subItems.type === 'link' &&
          subItems.title.toLowerCase().includes(searchText)
        ) {
          if (subItems.title.toLowerCase().startsWith(searchText)) {
            // If you want to get all the data with matching to letter entered remove this line(condition and leave items.push(subItems))
            items.push(subItems as Item);
          }
        }
        if (!subItems.children) return false;
        subItems.children.filter((subSubItems: Menu) => {
          if (subSubItems.title?.toLowerCase().includes(searchText)) {
            if (subSubItems.title.toLowerCase().startsWith(searchText)) {
              // If you want to get all the data with matching to letter entered remove this line(condition and leave items.push(subSubItems))
              items.push(subSubItems as Item);
            }
          }
        });
        return (this.menuItems = items);
      });
      // Used to show the No search result found box if the length of the items is 0
      if (!items.length) {
        this.SearchResultEmpty = true;
      } else {
        this.SearchResultEmpty = false;
      }
      return true;
    });
  }

  SearchModal(SearchModal: any) {
    this.modalService.open(SearchModal);
  }

  //  Used to clear previous search result
  clearSearch() {
    const headerSearch = document.querySelector('.header-search');
    if (headerSearch) {
      headerSearch.classList.remove('searchdrop');
    }
    this.text = '';
    this.menuItems = [];
    this.SearchResultEmpty = false;
    return this.text, this.menuItems;
  }

  SearchHeader() {
    document.querySelector('.header-search')?.classList.toggle('searchdrop');
  }

  isInputFocused: boolean = false;

  onInputFocus() {
    this.isInputFocused = true;
  }

  onInputBlur() {
    this.isInputFocused = false;
  }

  isFullscreen: boolean = false;

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
  }

  changeLanguage(language: string) {
    const html = document.querySelector('html');
    if (language === 'en') {
      html?.setAttribute('dir', 'ltr');
      this.currentFlag = './assets/images/flags/us_flag.jpg';
    } else {
      html?.setAttribute('dir', 'rtl');
      this.currentFlag = './assets/images/flags/uae_flag.jpg';
    }
    
    // Set the language in the translate service
    this.translateService.use(language);
    
    // Optional: Force update all translations on the page
    // This might be needed depending on how your app is structured
    this.translateService.reloadLang(language);
    
    // Store the selection in localStorage
    localStorage.setItem('language', language);

          if (language=='en') {
             this.userTaxType = this.authService.currentUserValue?.TaxType==1 ? 'Customer Type: Sales Tax' : 'Customer Type: Income Tax';
          } else {
             this.userTaxType = this.authService.currentUserValue?.TaxType==1 ? 'نوع العميل : ضريبة مبيعات' : 'نوع العميل : ضريبة دخل';
          }

  }
  
  setDefaultLanguage() {
    const storedLanguage = localStorage.getItem('language');
    if (!storedLanguage) {
      this.changeLanguage('en'); // Set default language to English
    } else {
      this.changeLanguage(storedLanguage);
    }
  }
  
  isActiveLanguage(language: string): boolean {
    return this.translateService.currentLang === language;
  }

  logout(): void {
    this.authService.logout();    
  }
}