import { getDb } from "@/db/db";
import { emailVerificationCodes } from "@/db/schema/users.db";
import { Template as ConfirmationCode } from "@/emails/confirmation-code";
import { env } from "@/env";
import { hash, verify } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { render } from "jsx-email";
import { createTransport } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { TimeSpan, createDate, isWithinExpirationDate } from "oslo";
import { alphabet, generateRandomString } from "oslo/crypto";
import { Resend } from "resend";
import type { UserId } from "robot-sdk";

export async function sendVerificationCode(emailAddress: string, code: string) {
	if (env.EMAIL_PROVIDER === "console") {
		console.info(`Email From: ${env.EMAIL_FROM} | Email To: ${emailAddress}`);
		console.info(`Your confirmation code: ${code}`);
		return true;
	}

	try {
		const html = await render(ConfirmationCode({ validationCode: code }));

		if (env.EMAIL_PROVIDER === "resend") {
			const resend = new Resend(env.RESEND_API_KEY);
			const { error } = await resend.emails.send({
				from: env.EMAIL_FROM,
				to: emailAddress,
				subject: `Your confirmation code: ${code}`,
				html,
				text: `Your confirmation code: ${code}`,
			});

			return error === null;
		}

		const transporter = getSmtpTransporter();
		await transporter.sendMail({
			from: env.EMAIL_FROM,
			to: emailAddress,
			subject: `Your confirmation code: ${code}`,
			html,
			text: `Your confirmation code: ${code}`,
		});

		return true;
	} catch {
		return false;
	}
}

export async function generateEmailVerificationCode(
	userId: UserId,
): Promise<string> {
	const existingCode = await getDb()
		.select({
			code: emailVerificationCodes.code,
			expiresAt: emailVerificationCodes.expiresAt,
		})
		.from(emailVerificationCodes)
		.where(eq(emailVerificationCodes.userId, userId));

	if (
		existingCode.length > 0 &&
		isWithinExpirationDate(existingCode[0].expiresAt)
	) {
		return existingCode[0].code;
	}

	const code = generateRandomString(8, alphabet("0-9"));
	if (existingCode.length > 0) {
		await getDb()
			.delete(emailVerificationCodes)
			.where(eq(emailVerificationCodes.userId, userId));
	}

	await getDb()
		.insert(emailVerificationCodes)
		.values({
			userId,
			code,
			expiresAt: createDate(new TimeSpan(5, "m")),
		});

	return code;
}

export async function verifyHash(hash: string, password: string) {
	return await verify(hash, password, {
		memoryCost: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1,
	});
}

export async function hashPassword(password: string) {
	const passwordHash = await hash(password, {
		memoryCost: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1,
	});

	return passwordHash;
}

function getSmtpTransporter() {
	const requiresAuth =
		typeof env.SMTP_USERNAME !== "undefined" &&
		typeof env.SMTP_PASSWORD !== "undefined";

	return createTransport(
		new SMTPTransport({
			auth: requiresAuth
				? {
						user: env.SMTP_USERNAME,
						pass: env.SMTP_PASSWORD,
					}
				: undefined,
			host: env.SMTP_HOST,
			port: env.SMTP_PORT,
			secure: env.SMTP_SECURE,
		}),
	);
}
