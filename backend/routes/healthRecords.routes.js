const express = require('express');
const router = express.Router();
const HealthRecord = require('../models/HealthRecord.model');
const { authenticatePatient } = require('../middleware/auth.middleware');

/**
 * @route   GET /api/health-records
 * @desc    Get patient's health records
 * @access  Private (Patient)
 */
router.get('/', authenticatePatient, async (req, res) => {
  try {
    const { category, type, limit } = req.query;
    
    const options = {};
    if (category) options.category = category;
    if (type) options.type = type;
    if (limit) options.limit = parseInt(limit);
    
    const records = await HealthRecord.getPatientHistory(
      req.patient.patientId,
      options
    );
    
    res.json({
      success: true,
      count: records.length,
      records: records.map(r => ({
        id: r._id,
        title: r.title,
        category: r.category,
        type: r.type,
        source: r.source,
        recordDate: r.recordDate,
        createdAt: r.createdAt,
        meta: r.meta,
        fileName: r.fileName,
        fileUrl: r.fileUrl,
        doctorNotes: r.doctorNotes,
        doctor: r.doctor ? {
          name: r.doctor.name,
          specialization: r.doctor.specialization
        } : null
      }))
    });
    
  } catch (error) {
    console.error('Fetch Records Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch health records'
    });
  }
});

/**
 * @route   POST /api/health-records
 * @desc    Add new health record
 * @access  Private (Patient)
 */
router.post('/', authenticatePatient, async (req, res) => {
  try {
    const { title, category, type, source, meta } = req.body;
    
    if (!title || !category || !type) {
      return res.status(400).json({
        success: false,
        message: 'Title, category, and type are required'
      });
    }
    
    const record = new HealthRecord({
      patient: req.patient._id,
      patientId: req.patient.patientId,
      title,
      category,
      type,
      source: source || 'upload',
      meta: meta || {}
    });
    
    await record.save();
    
    res.status(201).json({
      success: true,
      message: 'Health record added successfully',
      record: {
        id: record._id,
        title: record.title,
        category: record.category,
        type: record.type,
        recordDate: record.recordDate,
        createdAt: record.createdAt
      }
    });
    
  } catch (error) {
    console.error('Add Record Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add health record'
    });
  }
});

/**
 * @route   GET /api/health-records/:id
 * @desc    Get specific health record
 * @access  Private (Patient)
 */
router.get('/:id', authenticatePatient, async (req, res) => {
  try {
    const record = await HealthRecord.findOne({
      _id: req.params.id,
      patient: req.patient._id
    }).populate('doctor', 'name specialization');
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Health record not found'
      });
    }
    
    res.json({
      success: true,
      record: {
        id: record._id,
        title: record.title,
        category: record.category,
        type: record.type,
        source: record.source,
        recordDate: record.recordDate,
        createdAt: record.createdAt,
        meta: record.meta,
        fileName: record.fileName,
        fileUrl: record.fileUrl,
        doctorNotes: record.doctorNotes,
        doctor: record.doctor ? {
          name: record.doctor.name,
          specialization: record.doctor.specialization
        } : null
      }
    });
    
  } catch (error) {
    console.error('Fetch Record Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch health record'
    });
  }
});

/**
 * @route   DELETE /api/health-records/:id
 * @desc    Delete health record
 * @access  Private (Patient)
 */
router.delete('/:id', authenticatePatient, async (req, res) => {
  try {
    const record = await HealthRecord.findOneAndDelete({
      _id: req.params.id,
      patient: req.patient._id
    });
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Health record not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Health record deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete Record Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete health record'
    });
  }
});

module.exports = router;
