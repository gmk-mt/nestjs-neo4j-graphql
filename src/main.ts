import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    console.time("bootstrap")
    const app = await NestFactory.create(AppModule);
    console.timeEnd("bootstrap")
    await app.listen(3000);
}
bootstrap();
