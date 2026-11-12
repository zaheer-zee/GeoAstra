import { signatureService } from "../services/signature.service.js";

export const createSignature = async (req, res, next) => {
  try {
    const signature = await signatureService.createSignature(req.user.id, req.body);
    res.status(201).json({ status: "success", data: signature });
  } catch (error) {
    next(error);
  }
};

export const listSignatures = async (req, res, next) => {
  try {
    const signatures = await signatureService.listSignatures(req.user.id);
    res.status(200).json({ status: "success", data: signatures });
  } catch (error) {
    next(error);
  }
};

export const getSignature = async (req, res, next) => {
  try {
    const signature = await signatureService.getSignatureById(req.user.id, req.params.signatureId);
    res.status(200).json({ status: "success", data: signature });
  } catch (error) {
    next(error);
  }
};

export const deleteSignature = async (req, res, next) => {
  try {
    const result = await signatureService.deleteSignature(req.user.id, req.params.signatureId);
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

