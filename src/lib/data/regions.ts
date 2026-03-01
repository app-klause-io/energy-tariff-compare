import type { UkRegion } from '$lib/types/wizard';

export const UK_REGIONS: { value: UkRegion; label: string; hint: string }[] = [
	{ value: 'eastern', label: 'East England', hint: 'Norfolk, Suffolk, Essex, Cambs' },
	{ value: 'east-midlands', label: 'East Midlands', hint: 'Nottingham, Leicester, Derby' },
	{ value: 'london', label: 'London', hint: 'Greater London' },
	{
		value: 'merseyside',
		label: 'Merseyside & North Wales',
		hint: 'Liverpool, Chester, North Wales',
	},
	{ value: 'north-east', label: 'North East', hint: 'Newcastle, Durham, Teesside' },
	{ value: 'north-west', label: 'North West', hint: 'Manchester, Lancashire, Cumbria' },
	{ value: 'north-scotland', label: 'North Scotland', hint: 'Highlands, Aberdeen, Dundee' },
	{ value: 'south-east', label: 'South East', hint: 'Kent, Surrey, Sussex, Hampshire' },
	{ value: 'south-scotland', label: 'South Scotland', hint: 'Edinburgh, Glasgow, Borders' },
	{ value: 'south-wales', label: 'South Wales', hint: 'Cardiff, Swansea, Valleys' },
	{ value: 'south-west', label: 'South West', hint: 'Bristol, Devon, Cornwall, Dorset' },
	{ value: 'southern', label: 'Southern', hint: 'Reading, Oxford, Brighton area' },
	{ value: 'west-midlands', label: 'West Midlands', hint: 'Birmingham, Coventry, Stoke' },
	{ value: 'yorkshire', label: 'Yorkshire', hint: 'Leeds, Sheffield, Hull, York' },
];
