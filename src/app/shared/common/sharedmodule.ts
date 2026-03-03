import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { HeaderComponent } from './header/header.component';
import { PageHeaderComponent } from './page-header/page-header.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { SwitcherComponent } from './switcher/switcher.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ColorPickerModule } from 'ngx-color-picker';
import { MainLayoutComponent } from '../layouts/main-layout/main-layout.component';
import { AuthenticationLayoutComponent } from '../layouts/authentication-layout/authentication-layout.component';
import { FullscreenDirective } from '../directives/fullscreen.directive';
import { TapToTopComponent } from "./tap-to-top/tap-to-top.component";
import { HoverEffectSidebarDirective } from '../directives/hover-effect-sidebar.directive';
import { DropdownPositionDirective } from '../directives/dropdown-position.directive';
import { FooterComponent } from './footer/footer.component';
import { CustomHeaderComponent } from './custom-header/custom-header.component';
import { OverlayscrollbarsModule } from "overlayscrollbars-ngx";
import { TranslateModule } from '@ngx-translate/core';


@NgModule({
    declarations: [
        PageHeaderComponent,
        SidebarComponent,
        MainLayoutComponent, AuthenticationLayoutComponent, SwitcherComponent, HeaderComponent, TapToTopComponent,
        FooterComponent, CustomHeaderComponent
    ],
    exports: [
        PageHeaderComponent,
        SidebarComponent, SwitcherComponent, HeaderComponent, FooterComponent, CustomHeaderComponent, TapToTopComponent
    ],
    imports: [
        CommonModule,
        RouterModule,
        NgbModule,
        OverlayscrollbarsModule,
        ColorPickerModule,
        FormsModule, ReactiveFormsModule,
        RouterModule, FullscreenDirective,
        HoverEffectSidebarDirective, DropdownPositionDirective,
        TranslateModule
    ]
})
export class SharedModule { }
