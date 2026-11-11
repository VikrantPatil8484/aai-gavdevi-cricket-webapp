export type PlayerRole =
  | 'Wicketkeeper Batsman'
  | 'Batsman'
  | 'Bowler'
  | 'All Rounder';

export interface Player {
  id: string;
  name: string;
  jersey: string;
  role: PlayerRole;
  style: string;
  color: string;
  photo: string;
}

export interface Announcement {
  isActive: boolean;
  tournamentName: string;
  opposition: string;
  date: string;
  time: string;
  ground: string;
  round: string;
  lastNotifiedAt: string;
}

export interface Tournament {
  id: string;
  season: string;
  name: string;
  rank: number;
  date: string;
  location: string;
  prize: string;
  finalMomPlayer: string;
  finalMomStats: string;
  hasSeriesHonours: boolean;
  mosPlayer: string;
  mosStats: string;
  bestBatsmanPlayer: string;
  bestBatsmanStats: string;
  bestBowlerPlayer: string;
  bestBowlerStats: string;
  photos: string[];
}

export interface SquadNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  channels: string;
}
