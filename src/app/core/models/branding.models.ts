export interface Branding {
  empresaId?: number | null;
  nombre?: string | null;
  colorMarca?: string | null;
  logo?: string | null;
}

export interface BrandingPayload {
  colorMarca: string | null;
  logo: string | null;
}
