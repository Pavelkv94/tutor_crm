
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { TeacherRepository } from "./teacher.repository";
import { TeacherOutputDto } from "./dto/teacher.output.dto";
import { CreateTeacherDto } from "./dto/create-teacher.input.dto";
import { BcryptService } from "../auth/bcrypt.service";
import { Teacher } from "@prisma/client";
import { UpdateTeacherDto } from "./dto/update-teacher.input.dto";
import { FilterTeacherQuery } from "./dto/filter.query.dto";
import { TelegramLinkOutputDto } from "../telegram/dto/telegram-link.output.dto";
import { randomUUID } from "crypto";

@Injectable()
export class TeacherService {
	constructor(private readonly teacherRepository: TeacherRepository, private readonly bcryptService: BcryptService) {}

	async getTeacherById(id: number): Promise<TeacherOutputDto | null> {
		return await this.teacherRepository.getTeacherById(id);
	}

	async getTeacherByLogin(login: string): Promise<Teacher | null> {
		return await this.teacherRepository.getTeacherByLogin(login);
	}

	async getTeachers(filter: FilterTeacherQuery): Promise<TeacherOutputDto[]> {
		return await this.teacherRepository.getTeachers(filter);
	}

	async createTeacher(createTeacherDto: CreateTeacherDto): Promise<TeacherOutputDto> {
		const existingTeacher = await this.teacherRepository.getTeacherByLogin(createTeacherDto.login);
		if (existingTeacher) {
			throw new BadRequestException("Преподаватель уже существует");
		}
		const passwordHash = await this.bcryptService.generateHash(createTeacherDto.password);
		return await this.teacherRepository.createTeacher({
			...createTeacherDto,
			password: passwordHash,
		});
	}

	async updateTeacher(id: number, updateTeacherDto: UpdateTeacherDto): Promise<void> {
		const teacher = await this.teacherRepository.getTeacherById(id);
		if (!teacher) {
			throw new NotFoundException("Преподаватель не найден");
		}
		if (teacher.deleted_at) {
			throw new BadRequestException("Преподаватель удален");
		}
		await this.teacherRepository.updateTeacher(teacher.id, updateTeacherDto);
	}

	async deleteTeacher(id: number): Promise<void> {
		const teacher = await this.teacherRepository.getTeacherById(id);
		if (!teacher) {
			throw new NotFoundException("Преподаватель не найден");
		}
		if (teacher.deleted_at) {
			throw new BadRequestException("Преподаватель уже удален");
		}
		await this.teacherRepository.deleteTeacher(teacher.id);
	}
}