export interface MainPage {
    mainId: number;
    backgroundImage: string;
    mainTextAr: string;
    mainTextEn: string;
    subtextAr: string;
    subtextEn: string;
    createdAt: string;
    updatedAt: string | null;
  }
  
  export interface MainPageUpdate {
    backgroundImage?: File;
    mainTextAr: string;
    mainTextEn: string;
    subtextAr: string;
    subtextEn: string;
  }