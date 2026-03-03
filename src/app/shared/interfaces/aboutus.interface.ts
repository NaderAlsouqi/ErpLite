export interface AboutUs {
    aboutId: number;
    contentAr: string;
    contentEn: string;
    videoLink: string;
    createdAt: string;
    updatedAt: string | null;
  }
  
  export interface AboutUsUpdate {
    contentAr: string;
    contentEn: string;
    videoLink: string;
  }