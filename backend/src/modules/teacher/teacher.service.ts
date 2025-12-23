
import { BadRequestException, Injectable } from "@nestjs/common";
import { TeacherRepository } from "./teacher.repository";
import { TeacherOutputDto } from "./dto/teacher.output.dto";
import { CreateTeacherDto } from "./dto/create-teacher.input.dto";
import { BcryptService } from "../auth/bcrypt.service";
import { Teacher } from "@prisma/client";

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
}