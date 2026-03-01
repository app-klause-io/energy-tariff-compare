import type { UkRegion } from '$lib/types/wizard';

export const UK_REGIONS: { value: UkRegion; label: string; hint: string; gspGroupId: string }[] = [
	{
		value: 'eastern',
		label: 'East England',
		hint: 'Norfolk, Suffolk, Essex, Cambs',
		gspGroupId: '_A',
	},
	{
		value: 'east-midlands',
		label: 'East Midlands',
		hint: 'Nottingham, Leicester, Derby',
		gspGroupId: '_B',
	},
	{ value: 'london', label: 'London', hint: 'Greater London', gspGroupId: '_C' },
	{
		value: 'merseyside',
		label: 'Merseyside & North Wales',
		hint: 'Liverpool, Chester, North Wales',
		gspGroupId: '_D',
	},
	{
		value: 'west-midlands',
		label: 'West Midlands',
		hint: 'Birmingham, Coventry, Stoke',
		gspGroupId: '_E',
	},
	{
		value: 'north-east',
		label: 'North East',
		hint: 'Newcastle, Durham, Teesside',
		gspGroupId: '_F',
	},
	{
		value: 'north-west',
		label: 'North West',
		hint: 'Manchester, Lancashire, Cumbria',
		gspGroupId: '_G',
	},
	{
		value: 'southern',
		label: 'Southern',
		hint: 'Reading, Oxford, Brighton area',
		gspGroupId: '_H',
	},
	{
		value: 'south-east',
		label: 'South East',
		hint: 'Kent, Surrey, Sussex, Hampshire',
		gspGroupId: '_J',
	},
	{
		value: 'south-wales',
		label: 'South Wales',
		hint: 'Cardiff, Swansea, Valleys',
		gspGroupId: '_K',
	},
	{
		value: 'south-west',
		label: 'South West',
		hint: 'Bristol, Devon, Cornwall, Dorset',
		gspGroupId: '_L',
	},
	{
		value: 'yorkshire',
		label: 'Yorkshire',
		hint: 'Leeds, Sheffield, Hull, York',
		gspGroupId: '_M',
	},
	{
		value: 'south-scotland',
		label: 'South Scotland',
		hint: 'Edinburgh, Glasgow, Borders',
		gspGroupId: '_N',
	},
	{
		value: 'north-scotland',
		label: 'North Scotland',
		hint: 'Highlands, Aberdeen, Dundee',
		gspGroupId: '_P',
	},
];

export function getGspGroupId(region: UkRegion): string {
	const entry = UK_REGIONS.find((r) => r.value === region);
	if (!entry) {
		throw new Error(`Unknown region: ${region}`);
	}
	return entry.gspGroupId;
}
