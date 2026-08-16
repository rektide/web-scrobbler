import { describe, expect, test } from 'vitest';

import {
	createFallbackStation,
	filterStationNames,
	parseRadioCultStation,
} from '@/connectors/radiocult/station.ts';

describe('RadioCult station metadata', () => {
	test('parses public metadata into a URI-rich station snapshot', () => {
		expect(
			parseRadioCultStation('mountain-chill', {
				station: {
					id: 'mountain-chill',
					name: 'Mountain Chill® - KRKQ 95.5 FM',
					description:
						'KRKQ 95.5 FM Telluride, CO | Mountain Chill®',
					artwork: 'https://cdn.example/station.jpg',
					country: ['United States'],
					socials: {
						site: 'https://mountainchill.com',
						instagramHandle: 'mountainchillradio',
						facebook: 'MountainChillRadio',
					},
					channels: [
						{
							name: 'Mountain Chill®',
							streamingUrl:
								'https://mountain-chill.radiocult.fm/stream',
						},
					],
				},
			}),
		).toEqual({
			uri: 'https://mountainchill.com/',
			label: 'Mountain Chill® - KRKQ 95.5 FM',
			name: 'Mountain Chill®',
			description: 'KRKQ 95.5 FM Telluride, CO | Mountain Chill®',
			artworkUri: 'https://cdn.example/station.jpg',
			streamUri: 'https://mountain-chill.radiocult.fm/stream',
			countries: ['United States'],
			callSign: 'KRKQ',
			frequencyHz: 95_500_000,
			band: 'FM',
			identifiers: [
				{
					authorityUri: 'https://radiocult.fm/',
					value: 'mountain-chill',
					kind: 'slug',
					uri: 'https://app.radiocult.fm/embed/square-player/mountain-chill',
				},
				{
					authorityUri: 'https://www.instagram.com/',
					value: 'mountainchillradio',
					kind: 'social',
					uri: 'https://www.instagram.com/mountainchillradio/',
				},
				{
					authorityUri: 'https://www.facebook.com/',
					value: 'MountainChillRadio',
					kind: 'social',
					uri: 'https://www.facebook.com/MountainChillRadio/',
				},
			],
		});
	});

	test('falls back to the embed title and provider slug', () => {
		expect(
			createFallbackStation(
				'mountain-chill',
				'Mountain Chill® - KRKQ 95.5 FM',
			),
		).toMatchObject({
			uri: 'https://app.radiocult.fm/embed/square-player/mountain-chill',
			callSign: 'KRKQ',
			frequencyHz: 95_500_000,
			band: 'FM',
		});
	});

	test('encodes legacy station IDs in resource URIs', () => {
		expect(createFallbackStation('20ft Radio', '20ft Radio')).toMatchObject(
			{
				uri: 'https://app.radiocult.fm/embed/square-player/20ft%20Radio',
				identifiers: [
					{
						value: '20ft Radio',
						uri: 'https://app.radiocult.fm/embed/square-player/20ft%20Radio',
					},
				],
			},
		);
	});

	test('interprets AM frequencies as kilohertz', () => {
		expect(createFallbackStation('wabc', 'WABC 770 AM')).toMatchObject({
			callSign: 'WABC',
			frequencyHz: 770_000,
			band: 'AM',
		});
	});

	test('parses branded frequencies without inventing a callsign', () => {
		expect(
			createFallbackStation('the-drive', 'The Drive 94.7 FM'),
		).toMatchObject({
			frequencyHz: 94_700_000,
			band: 'FM',
		});
		expect(
			createFallbackStation('the-drive', 'The Drive 94.7 FM'),
		).not.toHaveProperty('callSign');
	});

	test('optionally strips trademark symbols from names', () => {
		const station = {
			uri: 'https://example.com/',
			label: 'Example® (TM) Radio',
			name: 'Example™ (R)',
			description: 'Example® station description',
		};
		expect(filterStationNames(station, true)).toEqual({
			...station,
			label: 'Example Radio',
			name: 'Example',
		});
		expect(filterStationNames(station, false)).toBe(station);
	});
});
