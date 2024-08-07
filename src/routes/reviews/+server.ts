import type { TopGGReview } from '@ayako/website/src/lib/scripts/types';
import DataBase from '$lib/server/database.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const reviews = await getReviews();
	if (!reviews.length) return json([]);

	return json(
		reviews.map((r) => ({
			...r,
			score: Number(r.score),
			username: r.username,
			avatar: r.avatar || `https://cdn.discordapp.com/embed/avatars/${Number(r.userid) % 6}.png`,
		})) as Returned,
	);
};

export type Returned = {
	userid: string;
	score: number;
	username: string;
	avatar: string;
	content: string;
}[];

const getReviews = async () => {
	const reviews = await DataBase.reviews.findMany();

	const outdatedReviews = reviews.filter((r) => Number(r.fetchat) < Date.now() - 86400000);
	if (outdatedReviews.length || !reviews.length) await updateReviews();

	return reviews.length ? reviews : DataBase.reviews.findMany();
};

const updateReviews = async () => {
	const newReviews = [];
	let lastPage = 1;
	let lastReviews = [];

	do {
		const res = (await fetch(
			`https://top.gg/api/client/entities/650691698409734151/reviews?page=${lastPage}`,
			{ method: 'POST' },
		).then((r) => (r.ok ? r.json() : []))) as TopGGReview[];

		newReviews.push(...res);
		lastPage += 1;
		lastReviews = res;
	} while (lastReviews.length);

	const users = await DataBase.users.findMany({
		where: {
			userid: {
				in: newReviews
					.map((r) => r.poster.avatar.match(/\d{17,19}/gm)?.[0])
					.filter((s): s is string => !!s),
			},
		},
	});

	const transactionResponse = await DataBase.$transaction(
		newReviews.map((r) => {
			const user = users.find((u) => r.poster.avatar.includes(u.userid));
			const avatar =
				user?.avatar ??
				(r.poster.avatar.includes('https://')
					? r.poster.avatar
							.replace('https://images.discordapp.net', 'https://cdn.discordapp.com')
							.replace('.png', '.webp')
					: `https://cdn.discordapp.com/embed/avatars/0.png`);

			return DataBase.reviews.upsert({
				where: { userid: user?.userid ?? r.posterId },
				update: { avatar, fetchat: Date.now() },
				create: {
					content: r.content,
					userid: r.posterId,
					avatar,
					score: r.score,
					username: r.poster.username,
					fetchat: Date.now(),
				},
			});
		}),
	);

	return transactionResponse;
};
