import { MaterialEntity } from "@/modules/material/domain/material.entity";
import { MaterialDto } from "@/modules/material/interface/dto/responses/material.dto";

export function mapMaterialToResponse(material: MaterialEntity): MaterialDto {
	return {
		id: material.id,
		courseId: material.courseId,
		originalName: material.originalName,
		mimeType: material.mimeType,
		sizeBytes: material.sizeBytes,
		type: material.type,
		status: material.status,
		created_at: material.created_at,
	};
}
