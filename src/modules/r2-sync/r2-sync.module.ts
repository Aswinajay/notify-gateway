import { Module, Global } from '@nestjs/common';
import { R2SyncService } from './r2-sync.service';

@Global()
@Module({
  providers: [R2SyncService],
  exports: [R2SyncService],
})
export class R2SyncModule {}
