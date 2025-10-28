import { ServerService } from '../services/serverService.js';
import { validationResult } from 'express-validator';
import Server from '../models/Server.js';

export const getAllServers = async (req, res, next) => {
  try {
    const {
      country,
      premium,
      sortBy = 'load',
      sortOrder = 'asc',
      limit = 50,
      offset = 0
    } = req.query;

    const filters = {
      country: country || null,
      premiumOnly: premium === 'true',
      sortBy,
      sortOrder,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const servers = await ServerService.getAllServers(filters);

    res.json({
      success: true,
      data: {
        servers,
        filters,
        total: servers.length
      }
    });

  } catch (error) {
    next(error);
  }
};

export const getServer = async (req, res, next) => {
  try {
    const { serverId } = req.params;

    const server = await ServerService.getServerById(serverId);

    res.json({
      success: true,
      data: server
    });

  } catch (error) {
    next(error);
  }
};

export const getServersByCountry = async (req, res, next) => {
  try {
    const { countryCode } = req.params;

    const servers = await ServerService.getServersByCountry(countryCode);

    res.json({
      success: true,
      data: {
        countryCode: countryCode.toUpperCase(),
        servers,
        count: servers.length
      }
    });

  } catch (error) {
    next(error);
  }
};

export const getOptimalServer = async (req, res, next) => {
  try {
    const { preferredCountry } = req.query;
    const userSubscription = req.user?.subscription || 'free';

    const server = await ServerService.getOptimalServer(userSubscription, preferredCountry);

    res.json({
      success: true,
      data: server
    });

  } catch (error) {
    next(error);
  }
};

export const getServerStats = async (req, res, next) => {
  try {
    const stats = await ServerService.getServerStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    next(error);
  }
};

export const getCountries = async (req, res, next) => {
  try {
    const countryStats = await Server.getCountryStats();

    const countries = countryStats.map(stat => ({
      code: stat._id,
      name: stat.country,
      serverCount: stat.serverCount,
      totalUsers: stat.totalUsers,
      avgLoad: Math.round(stat.avgLoad || 0),
      avgPing: Math.round(stat.avgPing || 0)
    }));

    res.json({
      success: true,
      data: countries
    });

  } catch (error) {
    next(error);
  }
};

export const getServerHealth = async (req, res, next) => {
  try {
    const servers = await ServerService.getServersNeedingMaintenance();

    res.json({
      success: true,
      data: {
        servers,
        critical: servers.filter(s => s.load > 95 || s.stats.healthStatus === 'offline').length,
        warning: servers.filter(s => s.load > 85 || s.stats.healthStatus === 'degraded').length,
        timestamp: new Date()
      }
    });

  } catch (error) {
    next(error);
  }
};