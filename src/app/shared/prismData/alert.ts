
let list =  `[
    {
          type: 'outline-success',
          message: 'A simple outline primary alert—check it out!',
      },
      ...
  ]`

export let alertTS = 
`<ngb-alert [dismissible]="true">
<strong>Holy guacamole!</strong> You should check in on some of those fields
below.
</ngb-alert>`
export let alertTS1 = 
` @for(alert of livealerts; track alert.id){

    <div class="alert alert-success mb-2" role="alert" aria-live="polite">
        {{ alert }}
        <button type="button" class="close" aria-label="Close" (click)="removeAlert(i)">
            <span aria-hidden="true">&times;</span>
        </button>
    </div>
    } 
    <button type="button" class="btn btn-primary" id="liveAlertBtn" (click)="showAlert()">
    show alert
 </button>`
 export let alertTS2 = 
`   @for (alert of alerts; track alert.type) {
    <ngb-alert  [type]="alert.type" (closed)="close(alert)">{{ alert.message }}</ngb-alert>
    } 
    // ts file
    ${list}
    close(alert: Alert) {
        this.alerts.splice(this.alerts.indexOf(alert), 1);
      }`
      export let alertTS3 = 
`       @for (alert1 of solidshadowalerts; track alert1.type) {
    <ngb-alert class="shadow-lg " [type]="alert1.type" (closed)="close1(alert1)">{{ alert1.message }}</ngb-alert>
    }`
    export let alertTS4 = 
    `<div class="alert alert-primary shadow-sm">A simple primary alert with small shadow—check it out!</div>
    <div class="alert alert-primary shadow">A simple primary alert with normal shadow—check it out!</div>
    <div class="alert alert-primary shadow-lg">A simple primary alert with large shadow—check it out!</div>
    <div class="alert alert-secondary shadow-sm">A simple secondary alert with small shadow—check it out!
    </div>
    <div class="alert alert-secondary shadow">A simple secondary alert with normal shadow—check it out!
    </div>
    <div class="alert alert-secondary shadow-lg">A simple secondary alert with large shadow—check it out!
    </div>`
    export let alertTS5 = 
    ` <div class="alert alert-primary" role="alert">
    A simple primary alert—check it out!
</div>
<div class="alert alert-secondary" role="alert">
    A simple secondary alert—check it out!
</div>
<div class="alert alert-success" role="alert">
    A simple success alert—check it out!
</div>
<div class="alert alert-danger" role="alert">
    A simple danger alert—check it out!
</div>
<div class="alert alert-warning" role="alert">
    A simple warning alert—check it out!
</div>
<div class="alert alert-info" role="alert">
    A simple info alert—check it out!
</div>
<div class="alert alert-light" role="alert">
    A simple light alert—check it out!
</div>
<div class="alert alert-dark" role="alert">
    A simple dark alert—check it out!
</div>`
export let alertTS6 = 
` <div class="alert alert-primary" role="alert">
A simple primary alert with <a href="javascript:void(0);" class="alert-link">an example
    link</a>.
Give it a click if you like.
</div>
<div class="alert alert-secondary" role="alert">
A simple secondary alert with <a href="javascript:void(0);" class="alert-link">an example
    link</a>. Give it a click if you like.
</div>
<div class="alert alert-success" role="alert">
A simple success alert with <a href="javascript:void(0);" class="alert-link">an example
    link</a>.
Give it a click if you like.
</div>
<div class="alert alert-danger" role="alert">
A simple danger alert with <a href="javascript:void(0);" class="alert-link">an example
    link</a>.
Give it a click if you like.
</div>
<div class="alert alert-warning" role="alert">
A simple warning alert with <a href="javascript:void(0);" class="alert-link">an example
    link</a>.
Give it a click if you like.
</div>
<div class="alert alert-info" role="alert">
A simple info alert with <a href="javascript:void(0);" class="alert-link">an example link</a>.
Give it a click if you like.
</div>
<div class="alert alert-light" role="alert">
A simple light alert with <a href="javascript:void(0);" class="alert-link">an example
    link</a>.
Give it a click if you like.
</div>
<div class="alert alert-dark" role="alert">
A simple dark alert with <a href="javascript:void(0);" class="alert-link">an example link</a>.
Give it a click if you like.
</div>`
export let alertTS7 = 
` @for (alert2 of solidcoloralerts; track alert2.type) {
    <ngb-alert  [type]="alert2.type" (closed)="close2(alert2)">{{ alert2.message }}</ngb-alert>
    } `
export let alertTS8 = 
`   @for (alert4 of roundoutlinealerts; track alert4.type) {
    <ngb-alert class="rounded-pill"[type]="alert4.type" (closed)="close4(alert4)">{{ alert4.message }}</ngb-alert>
    }  `
 export let alertTS9 = 
    `  @for (alert5 of rounddefaultalerts; track alert5.type) {
        <ngb-alert class="rounded-pill"[type]="alert5.type" (closed)="close5(alert5)">{{ alert5.message }}</ngb-alert>
        }  `  
 export let alertTS10 = 
        `  @for (alert6 of roundbuttonalerts; track alert6.type) {
            <ngb-alert class="rounded-pill"[type]="alert6.type" (closed)="close6(alert6)">{{ alert6.message }}</ngb-alert>
            }  `          
 export let alertTS11 = 
  `  @for (alert7 of svgalerts; track alert7.type) {
   <ngb-alert [type]="alert7.type" (closed)="close7(alert7)">
      <span [innerHTML]="getTrustedHtml(alert7.icon)" ></span>
       {{ alert7.message }}</ngb-alert>  }  ` 
export let alertTS12 = 
  ` @for (alert8 of iconsalerts; track alert8.type) {
    <ngb-alert [type]="alert8.type" (closed)="close8(alert8)">
        <span [innerHTML]="getTrustedHtml(alert8.icon)" ></span>
        {{ alert8.message }}</ngb-alert> }  ` 
 export let alertTS13 = 
 ` @for (alert9 of imagesalerts; track alert9.type) {
    <ngb-alert [type]="alert9.type" (closed)="close9(alert9)">
        <div class="avatar avatar-sm me-3 avatar-rounded">
            <img [src]="alert9.image"alt="img">
        </div>
        {{ alert9.message }}</ngb-alert>
    } `
    export let alertTS14 = 
  `    @for (alert10 of sizeimgssalerts; track alert10.type) {
    <ngb-alert [type]="alert10.type" (closed)="close10(alert10)">
        <div [class]="alert10.class">
            <img [src]="alert10.image"alt="img">
        </div>
        {{ alert10.message }}</ngb-alert>
    }     `  
    export let alertTS15 = 
  ` @for (alert11 of contentsalerts; track alert11.type) {
    <div class="col-xl-6">
            <ngb-alert [type]="alert11.type" (closed)="close11(alert11)">
                
                    <div [class]="alert11.class">
                    <h6 class="aletr-heading mb-0 text-fixed-white"> {{ alert11.message}}</h6>
                   
                </div>  <hr class="my-0">
                <div class="p-3">
                    <p class="mb-0">We appreciate you to let us know the bug in the template and for warning us about future consequences <a href="javascript:void(0);" class="fw-medium text-decoration-underline">Visit for support for queries ?</a></p>
                </div>  </ngb-alert>
          </div>
       
        }   `        
        export let alertTS16 = 
        `  @for (alert3 of roundsolidalerts; track alert3.type) {
            <ngb-alert class="rounded-pill"[type]="alert3.type" (closed)="close3(alert3)">{{ alert3.message }}</ngb-alert>
            }   ` 
