import type { PhotosService } from "../services/photos";
import type { ProductsService } from "../services/products";

export type Services = {
    products: ProductsService;
    photos: PhotosService;
};
