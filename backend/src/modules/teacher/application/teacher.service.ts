
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { TeacherRepository } from "@/modules/teacher/infrastructure/teacher.repository";
import { TeacherDto } from "@/modules/teacher/interface/dto/responses/teacher.dto";
import { CreateTeacherDto } from "@/modules/teacher/interface/dto/requests/create-teacher.input.dto";
import { BcryptService } from "@/infrastructure/bcrypt/bcrypt.service";
import { Teacher } from "@/infrastructure/prisma/generated/client";
import { UpdateTeacherDto } from "@/modules/teacher/interface/dto/requests/update-teacher.input.dto";
import { FilterTeacherQuery } from "@/modules/teacher/interface/dto/requests/filter.query.dto";

@Injectable()
export class TeacherService {
	constructor(private readonly teacherRepository: TeacherRepository, private readonly bcryptService: BcryptService) {}

	async getTeacherById(id: number): Promise<TeacherDto | null> {
		return await this.teacherRepository.getTeacherById(id);
	}

	async getTeacherByLogin(login: string): Promise<Teacher | null> {
		return await this.teacherRepository.getTeacherByLogin(login);
	}

	async getTeachers(filter: FilterTeacherQuery): Promise<TeacherDto[]> {
		return await this.teacherRepository.getTeachers(filter);
	}

	async createTeacher(createTeacherDto: CreateTeacherDto): Promise<TeacherDto> {
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

	async createAdmin(createAdminDto: { login: string, password: string, name: string }): Promise<void> {
		const existingAdmin = await this.teacherRepository.getTeacherByLogin(createAdminDto.login);
		if (existingAdmin) {
			throw new BadRequestException("Администратор уже существует");
		}
		const passwordHash = await this.bcryptService.generateHash(createAdminDto.password);
		await this.teacherRepository.createAdmin({
			login: createAdminDto.login,
			name: createAdminDto.name,
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