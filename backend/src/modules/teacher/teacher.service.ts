
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { TeacherRepository } from "./teacher.repository";
import { TeacherOutputDto } from "./dto/teacher.output.dto";
import { CreateTeacherDto } from "./dto/create-teacher.input.dto";
import { BcryptService } from "../auth/bcrypt.service";
import { Teacher } from "@prisma/client";
import { UpdateTeacherDto } from "./dto/update-teacher.input.dto";

@Injectable()
export class TeacherService {
	constructor(private readonly teacherRepository: TeacherRepository, private readonly bcryptService: BcryptService) {}

	async getTeacherById(id: number): Promise<any> {
		return await this.teacherRepository.getTeacherById(id);
	}

	async getTeacherByLogin(login: string): Promise<Teacher | null> {
		return await this.teacherRepository.getTeacherByLogin(login);
	}

	async getTeachers(): Promise<TeacherOutputDto[]> {
		return await this.teacherRepository.getTeachers();
	}

	async createTeacher(createTeacherDto: CreateTeacherDto): Promise<TeacherOutputDto> {
		const existingTeacher = await this.teacherRepository.getTeacherByLogin(createTeacherDto.login);
		if (existingTeacher) {
			throw new BadRequestException("Teacher already exists");
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
			throw new NotFoundException("Teacher not found");
		}
		const passwordHash = await this.bcryptService.generateHash(updateTeacherDto.password);
		updateTeacherDto.password = passwordHash;
		await this.teacherRepository.updateTeacher(teacher.id, updateTeacherDto);
	}

	async deleteTeacher(id: number): Promise<void> {
		const teacher = await this.teacherRepository.getTeacherById(id);
		if (!teacher) {
			throw new NotFoundException("Teacher not found");
		}
		await this.teacherRepository.deleteTeacher(teacher.id);
	}
}