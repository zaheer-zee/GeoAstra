import prisma from "../config/database.js";
import { ApiError } from "../utils/ApiError.js";

const DEFAULT_SIGNATURES = [
  {
    id: "default_vegetation_chlorophyll",
    ownerUserId: null,
    name: "Green Vegetation (High Chlorophyll)",
    sensor: "UNIVERSAL_HYPERSPECTRAL",
    wavelengths: [450, 550, 680, 750, 850, 1050, 1200, 1650, 2200],
    values: [0.05, 0.15, 0.04, 0.45, 0.52, 0.48, 0.40, 0.28, 0.12],
    units: "reflectance",
    source: "USGS Spectral Library v7",
    provenance: "Healthy deciduous canopy reference spectrum.",
  },
  {
    id: "default_mineral_kaolinite",
    ownerUserId: null,
    name: "Kaolinite Mineral (Diagnostic Doublet)",
    sensor: "UNIVERSAL_HYPERSPECTRAL",
    wavelengths: [2160, 2206, 2240, 2300, 2350],
    values: [0.65, 0.32, 0.62, 0.58, 0.55],
    units: "reflectance",
    source: "USGS Spectral Library v7",
    provenance: "Diagnostic Al-OH absorption doublet at 2.16 and 2.20 µm.",
  },
];

export const signatureService = {
  async ensureDefaultSignatures() {
    for (const sig of DEFAULT_SIGNATURES) {
      await prisma.targetSignature.upsert({
        where: { id: sig.id },
        update: {},
        create: sig,
      });
    }
  },

  async createSignature(userId, { name, sensor, wavelengths, values, units = "reflectance", source = "user_uploaded", provenance = null }) {
    if (!name || !wavelengths || !values) {
      throw ApiError.badRequest("Name, wavelengths, and spectral values are required");
    }
    if (!Array.isArray(wavelengths) || !Array.isArray(values)) {
      throw ApiError.badRequest("Wavelengths and values must be numerical arrays");
    }
    if (wavelengths.length !== values.length) {
      throw ApiError.badRequest("Wavelengths and values arrays must have identical length");
    }

    return prisma.targetSignature.create({
      data: {
        ownerUserId: userId,
        name,
        sensor: sensor || "CUSTOM",
        wavelengths,
        values,
        units,
        source,
        provenance,
      },
    });
  },

  async listSignatures(userId) {
    await this.ensureDefaultSignatures();

    return prisma.targetSignature.findMany({
      where: {
        OR: [
          { ownerUserId: userId },
          { ownerUserId: null }, // Public library reference signatures
        ],
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getSignatureById(userId, signatureId) {
    await this.ensureDefaultSignatures();

    const signature = await prisma.targetSignature.findUnique({
      where: { id: signatureId },
    });

    if (!signature) {
      throw ApiError.notFound("Target signature not found");
    }

    if (signature.ownerUserId && signature.ownerUserId !== userId) {
      throw ApiError.forbidden("Access denied: You do not own this signature");
    }

    return signature;
  },

  async deleteSignature(userId, signatureId) {
    const signature = await prisma.targetSignature.findUnique({
      where: { id: signatureId },
    });

    if (!signature) {
      throw ApiError.notFound("Target signature not found");
    }

    if (!signature.ownerUserId) {
      throw ApiError.forbidden("System reference signatures cannot be deleted");
    }

    if (signature.ownerUserId !== userId) {
      throw ApiError.forbidden("Access denied: You do not own this signature");
    }

    await prisma.targetSignature.delete({ where: { id: signatureId } });
    return { success: true, message: "Signature deleted" };
  },
};

