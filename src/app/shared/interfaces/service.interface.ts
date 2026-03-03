export interface Service {
    serviceId: number;
    nameAr: string;
    nameEn: string;
    descriptionAr: string;
    descriptionEn: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string | null;
  }
  
  export interface ServiceCreate {
    nameAr: string;
    nameEn: string;
    descriptionAr: string;
    descriptionEn: string;
    sortOrder: number;
    isActive: boolean;
  }
  
  export type ServiceUpdate = ServiceCreate;